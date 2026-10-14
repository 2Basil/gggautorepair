import { db } from "./db";

export const DEFAULT_METHODS = [
  {
    id: "card",
    type: "CARD",
    title: "Credit / Debit Card",
    badge: "Stripe & Square",
    details: "All major US credit & debit cards accepted (Visa, Mastercard, AmEx, Discover)",
    accountName: "ZZZ Auto Care US Merchant",
    instructions: "Instant 256-bit encrypted checkout via Stripe network.",
    active: true,
  },
  {
    id: "zelle",
    type: "ZELLE",
    title: "Zelle Instant Transfer",
    badge: "Instant / $0 Fee",
    details: "payments@zzzautorepair.com",
    accountName: "ZZZ Auto Care LLC",
    instructions: "Send from your mobile banking app. Include your invoice serial number in the memo.",
    active: true,
  },
  {
    id: "paypal",
    type: "PAYPAL",
    title: "PayPal & Venmo",
    badge: "PayPal / Venmo",
    details: "pay@zzzautorepair.com (Venmo: @ZZZ-AutoCare)",
    accountName: "ZZZ Auto Care",
    instructions: "Pay via PayPal balance, connected US checking account, or Venmo app.",
    active: true,
  },
  {
    id: "cashapp",
    type: "CASHAPP",
    title: "Cash App Pay",
    badge: "Square Cash",
    details: "$ZZZAutoCare",
    accountName: "ZZZ Auto Repair",
    instructions: "Send payment to our $cashtag or scan QR code at counter.",
    active: true,
  },
  {
    id: "applepay",
    type: "APPLE_PAY",
    title: "Apple Pay & Google Pay",
    badge: "Digital Wallets",
    details: "Biometric 1-touch checkout on iPhone, Mac, Android, and Chrome.",
    accountName: "ZZZ Auto Digital",
    instructions: "Authenticate instantly with Touch ID, Face ID, or Google Wallet.",
    active: true,
  },
  {
    id: "bank",
    type: "BANK",
    title: "Direct Bank Wire / ACH",
    badge: "US Banking",
    details: "Routing: 122105155 · Account: 9874561230",
    accountName: "ZZZ Auto Repair Commercial",
    instructions: "Direct bank ACH deposit. Settlement clears within 24-48 business hours.",
    active: true,
  },
  {
    id: "cash",
    type: "CASH",
    title: "Pay at Garage Counter / POS",
    badge: "In-Person",
    details: "Pay at 1240 Industrial Way, Bay 3",
    accountName: "Service Bay Terminal",
    instructions: "Pay in person with cash, debit card swipe, or check during vehicle pick-up.",
    active: true,
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

    const countRes = await db.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM "PaymentMethod"`);
    const count = Number(countRes[0]?.cnt || countRes[0]?.count || 0);

    if (count === 0) {
      for (const m of DEFAULT_METHODS) {
        await db.$executeRawUnsafe(
          `INSERT OR IGNORE INTO "PaymentMethod" ("id", "type", "title", "badge", "details", "accountName", "instructions", "active", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          m.id,
          m.type,
          m.title,
          m.badge,
          m.details,
          m.accountName,
          m.instructions,
          m.active ? 1 : 0,
          new Date().toISOString()
        );
      }
    }
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
      return rows.map((r) => ({
        ...r,
        active: Boolean(r.active),
      }));
    }
  } catch (err) {
    console.error("getPaymentMethods error:", err);
  }
  return onlyActive ? DEFAULT_METHODS.filter((m) => m.active) : DEFAULT_METHODS;
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
