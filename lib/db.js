import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const g = globalThis;

function client() {
  if (!g.__prisma) {
    const tursoUrl = process.env.TURSO_DATABASE_URL ? String(process.env.TURSO_DATABASE_URL).trim() : null;
    const tursoAuthToken = process.env.TURSO_AUTH_TOKEN ? String(process.env.TURSO_AUTH_TOKEN).trim() : null;

    if (tursoUrl && (tursoUrl.startsWith("libsql://") || tursoUrl.startsWith("https://"))) {
      try {
        const adapter = new PrismaLibSql({
          url: tursoUrl,
          authToken: tursoAuthToken,
        });
        g.__prisma = new PrismaClient({ adapter });
      } catch (err) {
        console.error("[lib/db] Error creating PrismaLibSql adapter:", err);
        g.__prisma = new PrismaClient();
      }
    } else {
      g.__prisma = new PrismaClient();
    }
  }
  return g.__prisma;
}

// Lazy proxy: the client is only created on first use (keeps `next build` working before the DB exists).
export const db = new Proxy(
  {},
  {
    get(_t, prop) {
      return client()[prop];
    },
  }
);
