// Adds ONLY the PriceSample table (safe to run more than once).
//   Turso / libSQL:  set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in .env, then  node prisma/add-price-sample.js
//   Local SQLite:    works with DATABASE_URL="file:./dev.db"
// If you use `prisma db push` for a local file you do not need this script.
require("dotenv/config");
const { createClient } = require("@libsql/client");

const SQL = `
CREATE TABLE IF NOT EXISTS "PriceSample" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "billId" INTEGER,
  "jobId" INTEGER,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Repairing',
  "make" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "vehicleType" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "fuel" TEXT NOT NULL DEFAULT 'PETROL',
  "queryText" TEXT NOT NULL DEFAULT '',
  "unitPrice" INTEGER NOT NULL,
  "qty" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceSample_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PriceSample_description_idx" ON "PriceSample"("description");
CREATE INDEX IF NOT EXISTS "PriceSample_make_model_idx" ON "PriceSample"("make", "model");
`;

async function main() {
  const turso = process.env.TURSO_DATABASE_URL;
  const url = turso && /^(libsql|https):/.test(turso) ? turso : process.env.DATABASE_URL;
  if (!url) throw new Error("Set TURSO_DATABASE_URL (or DATABASE_URL) in .env");
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  await client.executeMultiple(SQL);
  console.log("PriceSample table is ready on", url.replace(/\/\/.*@/, "//"));
}
main().catch((e) => { console.error(e); process.exit(1); });
