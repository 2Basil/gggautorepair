// Removes all demo customers, their vehicles, jobs, bills, and subscriptions.
// Keeps: owner account, service catalogue, and plans.
require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

const db =
  tursoUrl && (tursoUrl.startsWith("libsql://") || tursoUrl.startsWith("https://"))
    ? new PrismaClient({ adapter: new PrismaLibSql({ url: tursoUrl, authToken: tursoAuthToken }) })
    : new PrismaClient();

async function main() {
  // Find all customer (non-owner) users
  const customers = await db.user.findMany({ where: { role: "CUSTOMER" }, select: { id: true } });
  const ids = customers.map((u) => u.id);

  if (ids.length === 0) {
    console.log("No customer accounts found – nothing to delete.");
    return;
  }
  console.log(`Found ${ids.length} customer account(s). Deleting demo data...`);

  // Delete in dependency order
  await db.jobLog.deleteMany({ where: { job: { userId: { in: ids } } } });
  await db.billItem.deleteMany({ where: { bill: { userId: { in: ids } } } });
  await db.bill.deleteMany({ where: { userId: { in: ids } } });
  await db.jobItem.deleteMany({ where: { job: { userId: { in: ids } } } });
  await db.job.deleteMany({ where: { userId: { in: ids } } });
  await db.subscription.deleteMany({ where: { userId: { in: ids } } });
  await db.vehicle.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });

  console.log("Done. All demo customers, vehicles, jobs, bills and subscriptions have been removed.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
