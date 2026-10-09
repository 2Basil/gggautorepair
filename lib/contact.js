import { DEFAULT_COUNTRY_CODE } from "./settings";

export function normalizePhone(raw) {
  let d = String(raw || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return "+" + d.slice(1).replace(/\D/g, "");
  d = d.replace(/\D/g, "");
  if (d.startsWith("00")) return "+" + d.slice(2);
  if (d.length === 10) return DEFAULT_COUNTRY_CODE + d;
  if (d.length > 10) return "+" + d;
  return "";
}

export const telLink = (phone) => { const p = normalizePhone(phone); return p ? `tel:${p}` : null; };
export const waLink = (phone, text = "") => {
  const p = normalizePhone(phone).replace("+", "");
  return p ? `https://wa.me/${p}?text=${encodeURIComponent(text)}` : null;
};
export const mailLink = (email, subject = "", body = "") =>
  email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null;
