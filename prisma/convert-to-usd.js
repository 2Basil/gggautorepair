// ONE-TIME: converts every stored amount from the old rupee scale to US dollars.
//   node prisma/convert-to-usd.js            (default rate 0.05 = 1 old unit -> $0.05)
//   node prisma/convert-to-usd.js 0.012      (custom rate)
// Works on Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in .env) or a local file (DATABASE_URL="file:./dev.db").
// Safe-guard: records a marker row and refuses to run twice.
require("dotenv/config");
const { createClient } = require("@libsql/client");

const rate = Number(process.argv[2] || 0.05);
if (!(rate > 0)) { console.error("Invalid rate"); process.exit(1); }

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
const client = createClient({ url: url.startsWith("file:") && !url.includes("/") ? "file:./prisma/" + url.slice(5) : url, authToken: process.env.TURSO_AUTH_TOKEN });

const R = (col) => `CAST(ROUND("${col}" * ${rate}) AS INTEGER)`;
const STEPS = [
  ["Service", ["basePrice"]],
  ["Plan", ["price"]],
  ["Job", ["estMin", "estMax"]],
  ["JobItem", ["unitPrice"]],
  ["Bill", ["subtotal", "discount", "tax", "total"]],
  ["BillItem", ["unitPrice"]],
  ["PriceSample", ["unitPrice"]],
];

(async () => {
  await client.execute('CREATE TABLE IF NOT EXISTS "CurrencyMigration" ("id" INTEGER PRIMARY KEY, "rate" REAL, "at" TEXT)');
  const done = await client.execute('SELECT rate FROM "CurrencyMigration" LIMIT 1');
  if (done.rows.length) { console.log("Already converted (rate " + done.rows[0].rate + "). Nothing changed."); return; }
  const stmts = STEPS.map(([t, cols]) => ({ sql: `UPDATE "${t}" SET ${cols.map((c) => `"${c}" = ${R(c)}`).join(", ")}` }));
  // PriceSample table may not exist yet on older databases
  try { await client.batch(stmts, "write"); }
  catch (e) {
    if (/no such table: PriceSample/i.test(String(e))) await client.batch(stmts.slice(0, -1), "write");
    else throw e;
  }
  await client.batch([
    { sql: 'UPDATE "Bill" SET "total" = "subtotal" - "discount" + "tax"' },
    { sql: 'INSERT INTO "CurrencyMigration" ("rate","at") VALUES (?, ?)', args: [rate, new Date().toISOString()] },
  ], "write");
  console.log("Converted all amounts at rate " + rate + ". Done - do not run this again.");
})().catch((e) => { console.error(e); process.exit(1); });
