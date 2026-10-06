require("dotenv/config");
const { createClient } = require("@libsql/client");
const { execSync } = require("child_process");

async function main() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !url.startsWith("libsql://") && !url.startsWith("https://")) {
    console.log("Not a Turso / libSQL URL, skipping Turso migration.");
    return;
  }

  console.log(`Connecting to Turso: ${url}...`);
  const client = createClient({ url, authToken });

  console.log("Generating SQL from Prisma schema...");
  const sql = execSync("npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script", {
    encoding: "utf-8",
  });

  console.log("Applying schema to Turso database...");
  await client.executeMultiple(sql);
  console.log("✅ Schema successfully applied to Turso!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
