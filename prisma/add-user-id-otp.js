// ONE-TIME migration for Turso / libSQL (or a local file). Safe to run twice.
//   node prisma/add-user-id-otp.js
// - adds User.userCode + User.phoneVerified, creates PhoneOtp
// - gives every existing customer a Customer ID (ZZZ-<NAME>-<last 4 of phone>-<2 chars>)
// If you use a plain local file you can instead run:  npx prisma db push
require("dotenv/config");
const { createClient } = require("@libsql/client");

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const code = (name, phone) => {
  const l = String(name || "").toUpperCase().replace(/[^A-Z]/g, "").padEnd(3, "X").slice(0, 3);
  const d = String(phone || "").replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `ZZZ-${l}-${d}-${ALPHA[Math.floor(Math.random() * 31)]}${ALPHA[Math.floor(Math.random() * 31)]}`;
};

async function main() {
  const turso = process.env.TURSO_DATABASE_URL;
  const url = turso && /^(libsql|https):/.test(turso) ? turso : process.env.DATABASE_URL;
  if (!url) throw new Error("Set TURSO_DATABASE_URL (or DATABASE_URL) in .env");
  const c = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  const cols = (await c.execute('PRAGMA table_info("User")')).rows.map((r) => r.name);
  if (!cols.includes("userCode")) await c.execute('ALTER TABLE "User" ADD COLUMN "userCode" TEXT');
  if (!cols.includes("phoneVerified")) await c.execute('ALTER TABLE "User" ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false');
  await c.execute('CREATE UNIQUE INDEX IF NOT EXISTS "User_userCode_key" ON "User"("userCode")');
  await c.executeMultiple(`
    CREATE TABLE IF NOT EXISTS "PhoneOtp" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "phone" TEXT NOT NULL,
      "codeHash" TEXT,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "expiresAt" DATETIME NOT NULL,
      "verifiedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "PhoneOtp_phone_createdAt_idx" ON "PhoneOtp"("phone", "createdAt");
  `);
  const taken = new Set((await c.execute('SELECT "userCode" FROM "User" WHERE "userCode" IS NOT NULL')).rows.map((r) => r.userCode));
  const users = (await c.execute('SELECT "id","name","phone" FROM "User" WHERE "userCode" IS NULL')).rows;
  for (const u of users) {
    let k; do { k = code(u.name, u.phone); } while (taken.has(k));
    taken.add(k);
    await c.execute({ sql: 'UPDATE "User" SET "userCode" = ? WHERE "id" = ?', args: [k, u.id] });
  }
  console.log(`Done. ${users.length} existing user(s) received a Customer ID.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
