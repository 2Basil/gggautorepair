import { db } from "./db";

// Preset templates available for garage owner quick setup in Owner Portal
export const PRESET_TEMPLATES = [
  {
    type: "BANK",
    title: "Direct Bank Wire / ACH",
    badge: "US Banking",
    defaultInstructions: "Transfer amount using routing & account number below. Use invoice number as memo.",
  },
  {
    type: "ZELLE",
    title: "Zelle Transfer",
    badge: "Instant / $0 Fee",
    defaultInstructions: "Send via Zelle from your banking app. Include your invoice number in the memo.",
  },
  {
    type: "PAYPAL",
    title: "PayPal & Venmo",
    badge: "PayPal / Venmo",
    defaultInstructions: "Send payment to our PayPal handle or link. Include invoice number in note.",
  },
  {
    type: "CASHAPP",
    title: "Cash App Pay",
    badge: "Square Cash",
    defaultInstructions: "Send to our $cashtag and enter your invoice serial in the note.",
  },
  {
    type: "CASH",
    title: "Garage Counter / Cash",
    badge: "In-Person",
    defaultInstructions: "Pay in person with cash, debit card swipe, or check at garage counter upon pick-up.",
  },
  {
    type: "CARD",
    title: "Credit / Debit Card",
    badge: "Stripe Checkout",
    defaultInstructions: "Pay securely with Visa, Mastercard, American Express, Apple Pay, or Google Pay via Stripe's encrypted checkout.",
  },
  {
    type: "CUSTOM",
    title: "Custom Gateway / Other",
    badge: "Direct Pay",
    defaultInstructions: "Follow garage owner instructions to complete payment.",
  },
];

let tableInitialized = false;

export async function ensurePaymentMethodsTable() {
  if (tableInitialized) return;
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PaymentMethod" (
        "id" TEXT PRIMARY KEY,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "badge" TEXT,
        "details" TEXT NOT NULL,
        "accountName" TEXT,
        "instructions" TEXT,
        "active" INTEGER NOT NULL DEFAULT 1,
        "updatedAt" TEXT
      );
    `);

    // Clean out any legacy mock placeholder rows auto-seeded previously
    await db.$executeRawUnsafe(`
      DELETE FROM "PaymentMethod"
      WHERE "details" LIKE '%zzzautorepair%'
         OR "details" LIKE '%122105155%'
         OR "details" LIKE '%1240 Industrial Way%'
    `);

    tableInitialized = true;
  } catch (err) {
    console.error("ensurePaymentMethodsTable error:", err);
  }
}

export async function getPaymentMethods(onlyActive = false) {
  await ensurePaymentMethodsTable();
  try {
    const rows = await db.$queryRawUnsafe(
      onlyActive
        ? `SELECT * FROM "PaymentMethod" WHERE "active" = 1 ORDER BY rowid ASC`
        : `SELECT * FROM "PaymentMethod" ORDER BY rowid ASC`
    );
    if (rows && rows.length > 0) {
      return rows
        .filter((r) => !String(r.details || "").includes("zzzautorepair") && !String(r.details || "").includes("122105155"))
        .map((r) => ({
          ...r,
          active: Boolean(r.active),
        }));
    }
  } catch (err) {
    console.error("getPaymentMethods error:", err);
  }
  return [];
}

export async function savePaymentMethod(method) {
  await ensurePaymentMethodsTable();
  const id = method.id || `${method.type.toLowerCase()}_${Date.now()}`;
  await db.$executeRawUnsafe(
    `INSERT INTO "PaymentMethod" ("id", "type", "title", "badge", "details", "accountName", "instructions", "active", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT("id") DO UPDATE SET
       "type" = excluded."type",
       "title" = excluded."title",
       "badge" = excluded."badge",
       "details" = excluded."details",
       "accountName" = excluded."accountName",
       "instructions" = excluded."instructions",
       "active" = excluded."active",
       "updatedAt" = excluded."updatedAt"`,
    id,
    method.type,
    method.title,
    method.badge || method.type,
    method.details,
    method.accountName || "",
    method.instructions || "",
    method.active ? 1 : 0,
    new Date().toISOString()
  );
}

export async function deletePaymentMethod(id) {
  await ensurePaymentMethodsTable();
  await db.$executeRawUnsafe(`DELETE FROM "PaymentMethod" WHERE "id" = ?`, id);
}

export async function togglePaymentMethodActive(id, active) {
  await ensurePaymentMethodsTable();
  await db.$executeRawUnsafe(
    `UPDATE "PaymentMethod" SET "active" = ?, "updatedAt" = ? WHERE "id" = ?`,
    active ? 1 : 0,
    new Date().toISOString(),
    id
  );
}
