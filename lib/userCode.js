import { db } from "./db";

// ----------- username helpers -----------

/** Build a clean username slug from a full name, e.g. "Aarav Sharma" → "aarav_sharma" */
export function buildUsername(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")  // strip non-alphanumeric
    .replace(/\s+/g, "_")         // spaces → underscores
    .replace(/^_+|_+$/g, "")      // trim leading/trailing underscores
    .slice(0, 28)                 // max length
    || "user";
}

/** Validates a username entered by the user. Returns an error string or null. */
export function validateUsername(u) {
  if (!u || u.length < 3) return "Username must be at least 3 characters.";
  if (u.length > 28) return "Username must be 28 characters or fewer.";
  if (!/^[a-z0-9_]+$/.test(u)) return "Username can only contain lowercase letters, numbers, and underscores.";
  return null;
}

/** Returns a unique username for this user based on their name. */
export async function uniqueUsername(name) {
  const base = buildUsername(name);
  // try the plain slug first
  if (!(await db.user.findUnique({ where: { username: base }, select: { id: true } }))) return base;
  // append incrementing numbers until free
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base.slice(0, 24)}_${i}`;
    if (!(await db.user.findUnique({ where: { username: candidate }, select: { id: true } }))) return candidate;
  }
  return `${base.slice(0, 20)}_${Date.now().toString(36).slice(-4)}`;
}

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
