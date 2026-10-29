import { db } from "./db";
import { GARAGE } from "./config";

// Best-effort transactional email (Brevo or Resend, same EMAIL_* env as the OTP emails).
// Never throws: a mail problem must never break a booking or payment.
export async function sendMail(to, subject, html) {
  try {
    const key = process.env.EMAIL_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!key || !from || !to || !String(to).includes("@") || String(to).endsWith("@staff.local")) return false;
    const name = process.env.EMAIL_FROM_NAME || GARAGE.name;
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
    return res.ok;
  } catch (e) {
    console.error("[mail]", e?.message);
    return false;
  }
}

const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function wrap(title, lines, link) {
  const body = lines.map((l) => `<p style="margin:0 0 10px">${esc(l)}</p>`).join("");
  const btn = link ? `<p><a href="${esc(link)}" style="background:#e11d2e;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Open</a></p>` : "";
  return `<div style="font-family:Arial,sans-serif;max-width:520px"><h2 style="margin:0 0 12px">${esc(title)}</h2>${body}${btn}<p style="color:#888;font-size:12px">${esc(GARAGE.name)}</p></div>`;
}

// Email a customer by user id.
export async function notifyUser(userId, subject, lines, link) {
  try {
    const u = await db.user.findUnique({ where: { id: Number(userId) }, select: { email: true, role: true } });
    if (!u || u.role !== "CUSTOMER") return false;
    return await sendMail(u.email, subject, wrap(subject, lines, link));
  } catch {
    return false;
  }
}
