// ONE-TIME setup for the owner portal (safe to run again). Works on Turso or a local file.
//   node prisma/owner-setup.js
// 1. creates the ServicePrice table (owner-set prices per vehicle type)
// 2. fills empty prices for every service x vehicle type from the base price (owner edits them in the portal)
// 3. adds the staff-login column (User.empId)
// 4. creates / updates the owner login and removes owner rights from the old demo owner
// Owner email/password come from OWNER_EMAIL / OWNER_PASSWORD in .env; if not set the defaults below are used.
// The password is only set when the owner account is first created - after that the owner changes it in Settings.
require("dotenv/config");
const { createClient } = require("@libsql/client");
const bcrypt = require("bcryptjs");

const MULT = { BIKE: 0.4, HATCHBACK: 1.0, SEDAN: 1.15, SUV: 1.35, LUXURY: 1.8, TRACTOR: 1.6, TRUCK: 2.2, BUS: 2.5 };
const OWNER_EMAIL = (process.env.OWNER_EMAIL || "owner.ZZZ@autorepairs.com").toLowerCase();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "ownerZZZ123";

async function main() {
  const turso = process.env.TURSO_DATABASE_URL;
  const url = turso && /^(libsql|https):/.test(turso) ? turso : process.env.DATABASE_URL;
  if (!url) throw new Error("Set TURSO_DATABASE_URL (or DATABASE_URL) in .env");
  const c = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  await c.executeMultiple(`
    CREATE TABLE IF NOT EXISTS "ServicePrice" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "serviceId" INTEGER NOT NULL,
      "vehicleType" TEXT NOT NULL,
      "price" INTEGER NOT NULL,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ServicePrice_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "ServicePrice_serviceId_vehicleType_key" ON "ServicePrice"("serviceId", "vehicleType");
  `);

  // staff logins: User.empId
  const ucols = (await c.execute('PRAGMA table_info("User")')).rows.map((r) => r.name);
  if (!ucols.includes("empId")) await c.execute('ALTER TABLE "User" ADD COLUMN "empId" TEXT');
  await c.execute('CREATE UNIQUE INDEX IF NOT EXISTS "User_empId_key" ON "User"("empId")');

  const services = (await c.execute('SELECT "id","basePrice" FROM "Service"')).rows;
  const have = new Set((await c.execute('SELECT "serviceId","vehicleType" FROM "ServicePrice"')).rows.map((r) => r.serviceId + ":" + r.vehicleType));
  let added = 0;
  for (const s of services) for (const [type, m] of Object.entries(MULT)) {
    if (have.has(s.id + ":" + type)) continue;
    await c.execute({ sql: 'INSERT INTO "ServicePrice" ("serviceId","vehicleType","price") VALUES (?,?,?)', args: [s.id, type, Math.max(1, Math.round(Number(s.basePrice) * m))] });
    added++;
  }
  console.log(`Prices: added ${added} starting prices.`);

  const hash = await bcrypt.hash(OWNER_PASSWORD, 10);
  const u = (await c.execute({ sql: 'SELECT "id" FROM "User" WHERE "email" = ?', args: [OWNER_EMAIL] })).rows[0];
  if (u) {
    await c.execute({ sql: 'UPDATE "User" SET "role" = \'OWNER\' WHERE "id" = ?', args: [u.id] });
    console.log("Owner account exists - role confirmed, password left unchanged.");
  } else {
    await c.execute({ sql: 'INSERT INTO "User" ("name","email","phone","passwordHash","role") VALUES (?,?,?,?,\'OWNER\')', args: ["Garage Owner", OWNER_EMAIL, "-", hash] });
    console.log("Owner account created:", OWNER_EMAIL);
  }
  await c.execute({ sql: 'UPDATE "User" SET "role" = \'CUSTOMER\' WHERE "email" = ? AND "email" <> ?', args: ["owner@pitstop.local", OWNER_EMAIL] });
  console.log("Done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
