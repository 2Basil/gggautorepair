import { cookies } from "next/headers";
import { createHash, randomInt } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { normalizePhone } from "./contact";

/*
  Verification codes. OTP_PROVIDER in .env picks how the code is delivered:
    email   (default) - code is emailed. Free: Brevo (300 emails/day) or Resend. Set EMAIL_PROVIDER + keys, see .env.example.
    twilio             - real SMS through Twilio Verify (paid; a trial only texts numbers you verified).
    console            - SMS-style demo: code printed in the server terminal / shown on screen in dev only.
  In "email" mode without keys, dev shows the code on screen so you can still test.
*/

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-secret-change-me-in-env-file");
const provider = () => (process.env.OTP_PROVIDER || "email").toLowerCase();
export const otpChannel = () => (provider() === "email" ? "email" : "phone");
const TTL_MIN = 10;
const MAX_SENDS = 3; // per phone per 10 minutes
const MAX_TRIES = 5;

export { normalizePhone };

const hash = (phone, code) => createHash("sha256").update(`${phone}:${code}:${process.env.SESSION_SECRET || ""}`).digest("hex");

async function twilio(path, body) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: tok, TWILIO_VERIFY_SID: svc } = process.env;
  if (!sid || !tok || !svc) throw new Error("Twilio is not configured");
  const res = await fetch(`https://verify.twilio.com/v2/Services/${svc}/${path}`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Twilio error ${res.status}`);
  return json;
}

const showCode = () => process.env.NODE_ENV !== "production" || process.env.OTP_SHOW_CODE === "true";
const normEmail = (e) => String(e || "").trim().toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

async function sendEmail(to, code) {
  const name = process.env.EMAIL_FROM_NAME || "ZZZ AUTO REPAIR";
  const from = process.env.EMAIL_FROM;
  const key = process.env.EMAIL_API_KEY;
  if (!from || !key) return false; // not configured
  const subject = `${code} is your ${name} verification code`;
  const html = `<div style="font-family:Arial,sans-serif"><p>Your verification code is</p><p style="font-size:28px;letter-spacing:6px;font-weight:bold">${code}</p><p>It expires in ${TTL_MIN} minutes. If you did not request it, ignore this email.</p><p>${name}</p></div>`;
  const brevo = (process.env.EMAIL_PROVIDER || "brevo").toLowerCase() === "brevo";
  const res = brevo
    ? await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": key, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: { name, email: from }, to: [{ email: to }], subject, htmlContent: html }),
      })
    : await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: `${name} <${from}>`, to: [to], subject, html }),
      });
  if (!res.ok) throw new Error((await res.text().catch(() => "")).slice(0, 200) || `Email provider error ${res.status}`);
  return true;
}

// contact = email address (channel "email") or phone number (channel "phone")
function keyOf(contact) {
  if (otpChannel() === "email") { const e = normEmail(contact); return validEmail(e) ? "email:" + e : ""; }
  const p = normalizePhone(contact); return p.length >= 9 ? p : "";
}

export async function sendOtp(contact) {
  const key = keyOf(contact);
  if (!key) return { error: otpChannel() === "email" ? "Enter a valid email address." : "Enter a valid mobile number." };
  const since = new Date(Date.now() - TTL_MIN * 60000);
  const recent = await db.phoneOtp.count({ where: { phone: key, createdAt: { gt: since } } });
  if (recent >= MAX_SENDS) return { error: "Too many codes requested. Please wait a few minutes and try again." };
  const expiresAt = new Date(Date.now() + TTL_MIN * 60000);

  if (provider() === "twilio") {
    try { await twilio("Verifications", { To: key, Channel: "sms" }); }
    catch (e) { return { error: "Could not send the SMS: " + e.message }; }
    await db.phoneOtp.create({ data: { phone: key, expiresAt } });
    return { ok: true, target: key };
  }
  const code = String(randomInt(100000, 1000000));
  if (provider() === "email") {
    const to = key.slice(6);
    let sent = false;
    try { sent = await sendEmail(to, code); }
    catch (e) { return { error: "Could not send the email: " + e.message }; }
    if (!sent && !showCode()) return { error: "Email sending is not set up yet. Ask the garage to add the email settings." };
    await db.phoneOtp.create({ data: { phone: key, codeHash: hash(key, code), expiresAt } });
    if (!sent) console.log(`[OTP] ${key} -> ${code}`);
    return { ok: true, target: to, devCode: !sent || process.env.OTP_SHOW_CODE === "true" ? code : undefined };
  }
  await db.phoneOtp.create({ data: { phone: key, codeHash: hash(key, code), expiresAt } });
  console.log(`[OTP] ${key} -> ${code}`);
  return { ok: true, target: key, devCode: showCode() ? code : undefined };
}

export async function checkOtp(contact, rawCode) {
  const key = keyOf(contact);
  const code = String(rawCode || "").replace(/\D/g, "");
  if (!key || code.length < 4) return { error: "Enter the code we sent you." };

  if (provider() === "twilio") {
    try {
      const r = await twilio("VerificationCheck", { To: key, Code: code });
      if (r.status !== "approved") return { error: "That code is not correct." };
    } catch (e) { return { error: "Could not verify the code: " + e.message }; }
  } else {
    const row = await db.phoneOtp.findFirst({ where: { phone: key, verifiedAt: null }, orderBy: { createdAt: "desc" } });
    if (!row || row.expiresAt < new Date()) return { error: "That code has expired. Request a new one." };
    if (row.attempts >= MAX_TRIES) return { error: "Too many wrong attempts. Request a new code." };
    if (row.codeHash !== hash(key, code)) {
      await db.phoneOtp.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
      return { error: "That code is not correct." };
    }
    await db.phoneOtp.update({ where: { id: row.id }, data: { verifiedAt: new Date() } });
  }
  // proof of verification: short-lived signed cookie checked at registration
  const token = await new SignJWT({ key }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30m").sign(secret());
  (await cookies()).set("otp_ok", token, { httpOnly: true, sameSite: "lax", secure: process.env.COOKIE_SECURE === "true", path: "/", maxAge: 1800 });
  return { ok: true };
}

export async function isVerified(contact) {
  const token = (await cookies()).get("otp_ok")?.value;
  const key = keyOf(contact);
  if (!token || !key) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.key === key;
  } catch { return false; }
}
