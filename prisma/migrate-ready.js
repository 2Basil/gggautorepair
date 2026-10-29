// ONE-TIME migration for Turso / libSQL (or a local file). Safe to run twice.
//   node prisma/migrate-ready.js
// Adds: Job.quotedAt/acceptedAt/ownerNote/assignedToId, and tables PaymentMethod, RateLimit, ActivityLog, Review.
// Also back-fills quotedAt/acceptedAt for existing jobs from their log text.
require("dotenv/config");
const { createClient } = require("@libsql/client");

async function main() {
  const turso = process.env.TURSO_DATABASE_URL;
  const url = turso && /^(libsql|https):/.test(turso) ? turso : process.env.DATABASE_URL;
  if (!url) throw new Error("Set TURSO_DATABASE_URL (or DATABASE_URL) in .env");
  const c = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  const cols = (await c.execute('PRAGMA table_info("Job")')).rows.map((r) => r.name);
  const add = async (name, type) => {
    if (!cols.includes(name)) await c.execute(`ALTER TABLE "Job" ADD COLUMN "${name}" ${type}`);
  };
  await add("quotedAt", "DATETIME");
  await add("acceptedAt", "DATETIME");
  await add("ownerNote", "TEXT");
  await add("assignedToId", "INTEGER");

  await c.executeMultiple(`
    CREATE TABLE IF NOT EXISTS "PaymentMethod" (
      "id" TEXT NOT NULL PRIMARY KEY, "type" TEXT NOT NULL, "title" TEXT NOT NULL, "badge" TEXT,
      "details" TEXT NOT NULL, "accountName" TEXT, "instructions" TEXT,
      "active" INTEGER NOT NULL DEFAULT 1, "updatedAt" TEXT
    );
    CREATE TABLE IF NOT EXISTS "RateLimit" (
      "key" TEXT NOT NULL PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 0, "resetAt" DATETIME NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "ActivityLog" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "actorId" INTEGER, "actorName" TEXT,
      "action" TEXT NOT NULL, "detail" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
    CREATE TABLE IF NOT EXISTS "Review" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "jobId" INTEGER NOT NULL, "userId" INTEGER NOT NULL,
      "rating" INTEGER NOT NULL, "comment" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Review_jobId_key" ON "Review"("jobId");
  `);

  // Back-fill from log text (old data only)
  await c.execute(`UPDATE "Job" SET "quotedAt" = (SELECT MIN("createdAt") FROM "JobLog" WHERE "JobLog"."jobId" = "Job"."id" AND "note" LIKE 'Estimate sent:%') WHERE "quotedAt" IS NULL`);
  await c.execute(`UPDATE "Job" SET "acceptedAt" = (SELECT MIN("createdAt") FROM "JobLog" WHERE "JobLog"."jobId" = "Job"."id" AND (LOWER("note") LIKE '%customer accepted%' OR LOWER("note") LIKE '%booked service%')) WHERE "acceptedAt" IS NULL`);
  console.log("Done. Database is up to date.");
}
main().catch((e) => { console.error(e); process.exit(1); });
