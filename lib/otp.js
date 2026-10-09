import { cookies } from "next/headers";
import { createHash, randomInt } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { normalizePhone } from "./contact";

/*
  Phone OTP. Provider is chosen with OTP_PROVIDER in .env:
    console  (default) - code is generated here and printed in the server terminal; shown on screen
                          only when NODE_ENV !== "production". For development and demos.
    twilio             - real SMS through Twilio Verify. Needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
                          TWILIO_VERIFY_SID. A Twilio *trial* only texts numbers you verified in the Twilio console.
*/

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-secret-change-me-in-env-file");
const provider = () => (process.env.OTP_PROVIDER || "console").toLowerCase();
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

export async function sendOtp(rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (phone.length < 9) return { error: "Enter a valid mobile number." };
  const since = new Date(Date.now() - TTL_MIN * 60000);
  const recent = await db.phoneOtp.count({ where: { phone, createdAt: { gt: since } } });
  if (recent >= MAX_SENDS) return { error: "Too many codes requested. Please wait a few minutes and try again." };

  if (provider() === "twilio") {
    try { await twilio("Verifications", { To: phone, Channel: "sms" }); }
    catch (e) { return { error: "Could not send the SMS: " + e.message }; }
    await db.phoneOtp.create({ data: { phone, expiresAt: new Date(Date.now() + TTL_MIN * 60000) } });
    return { ok: true, phone };
  }
  const code = String(randomInt(100000, 1000000));
  await db.phoneOtp.create({ data: { phone, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + TTL_MIN * 60000) } });
  console.log(`[OTP] ${phone} -> ${code}`);
  return { ok: true, phone, devCode: process.env.NODE_ENV === "production" ? undefined : code };
}

export async function checkOtp(rawPhone, rawCode) {
  const phone = normalizePhone(rawPhone);
  const code = String(rawCode || "").replace(/\D/g, "");
  if (!phone || code.length < 4) return { error: "Enter the code we sent you." };

  if (provider() === "twilio") {
    try {
      const r = await twilio("VerificationCheck", { To: phone, Code: code });
      if (r.status !== "approved") return { error: "That code is not correct." };
    } catch (e) { return { error: "Could not verify the code: " + e.message }; }
  } else {
    const row = await db.phoneOtp.findFirst({ where: { phone, verifiedAt: null }, orderBy: { createdAt: "desc" } });
    if (!row || row.expiresAt < new Date()) return { error: "That code has expired. Request a new one." };
    if (row.attempts >= MAX_TRIES) return { error: "Too many wrong attempts. Request a new code." };
    if (row.codeHash !== hash(phone, code)) {
      await db.phoneOtp.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
      return { error: "That code is not correct." };
    }
    await db.phoneOtp.update({ where: { id: row.id }, data: { verifiedAt: new Date() } });
  }
  // proof of verification: short-lived signed cookie checked at registration
  const token = await new SignJWT({ phone }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30m").sign(secret());
  (await cookies()).set("phone_ok", token, { httpOnly: true, sameSite: "lax", secure: process.env.COOKIE_SECURE === "true", path: "/", maxAge: 1800 });
  return { ok: true, phone };
}

export async function isPhoneVerified(rawPhone) {
  const token = (await cookies()).get("phone_ok")?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.phone === normalizePhone(rawPhone);
  } catch { return false; }
}
