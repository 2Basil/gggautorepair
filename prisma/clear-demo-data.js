// DELETES ALL CUSTOMER DATA (demo + test): customers, their vehicles, jobs, bills, plan subscriptions,
// the AI's learned price samples and old OTP codes. KEEPS: owner + employee accounts, services, prices, plans.
// There is no undo.
//   node prisma/clear-demo-data.js          -> only shows what would be deleted
//   node prisma/clear-demo-data.js --yes    -> deletes it
require("dotenv/config");
const { createClient } = require("@libsql/client");

async function main() {
  const turso = process.env.TURSO_DATABASE_URL;
  const url = turso && /^(libsql|https):/.test(turso) ? turso : process.env.DATABASE_URL;
  if (!url) throw new Error("Set TURSO_DATABASE_URL (or DATABASE_URL) in .env");
  const c = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  const cust = `(SELECT "id" FROM "User" WHERE "role" = 'CUSTOMER')`;

  const count = async (sql) => Number((await c.execute(sql)).rows[0].n);
  const exists = async (t) => (await c.execute({ sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`, args: [t] })).rows.length > 0;
  const hasSample = await exists("PriceSample");
  const hasOtp = await exists("PhoneOtp");
  console.log("Customers :", await count(`SELECT COUNT(*) n FROM "User" WHERE "role" = 'CUSTOMER'`));
  console.log("Vehicles  :", await count(`SELECT COUNT(*) n FROM "Vehicle"`));
  console.log("Jobs      :", await count(`SELECT COUNT(*) n FROM "Job"`));
  console.log("Bills     :", await count(`SELECT COUNT(*) n FROM "Bill"`));
  console.log("Kept      : owner/employee accounts, services, prices, plans");

  if (!process.argv.includes("--yes")) {
    console.log('\nNothing deleted. Run again with --yes to delete all of the above.');
    return;
  }
  const stmts = [
    ...(hasSample ? [`DELETE FROM "PriceSample"`] : []),
    `DELETE FROM "BillItem" WHERE "billId" IN (SELECT "id" FROM "Bill")`,
    `DELETE FROM "Bill"`,
    `DELETE FROM "JobLog"`,
    `DELETE FROM "JobItem"`,
    `DELETE FROM "Job"`,
    `DELETE FROM "Subscription"`,
    `DELETE FROM "Vehicle"`,
    ...(hasOtp ? [`DELETE FROM "PhoneOtp"`] : []),
    `DELETE FROM "User" WHERE "role" = 'CUSTOMER'`,
  ];
  await c.batch(stmts, "write");
  console.log("\nDone. All customer data deleted. The site is clean and ready for real customers.");
}
main().catch((e) => { console.error(e); process.exit(1); });
