import { db } from "./db";

// Public customer ID built from name + phone: ZZZ-<3 letters of name>-<last 4 digits of phone>-<2 random>
// e.g. "Aarav Sharma", 9811114321  ->  ZZZ-AAR-4321-K7
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function buildUserCode(name, phone) {
  const letters = String(name || "").toUpperCase().replace(/[^A-Z]/g, "").padEnd(3, "X").slice(0, 3);
  const last4 = String(phone || "").replace(/\D/g, "").slice(-4).padStart(4, "0");
  const rnd = Array.from({ length: 2 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
  return `ZZZ-${letters}-${last4}-${rnd}`;
}

export async function uniqueUserCode(name, phone) {
  for (let i = 0; i < 12; i++) {
    const code = buildUserCode(name, phone);
    if (!(await db.user.findUnique({ where: { userCode: code }, select: { id: true } }))) return code;
  }
  return buildUserCode(name, phone) + Date.now().toString(36).slice(-2).toUpperCase();
}
