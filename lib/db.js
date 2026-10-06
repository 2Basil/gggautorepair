import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const g = globalThis;

function client() {
  if (!g.__prisma) {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

    if (tursoUrl && (tursoUrl.startsWith("libsql://") || tursoUrl.startsWith("https://"))) {
      const adapter = new PrismaLibSql({
        url: tursoUrl,
        authToken: tursoAuthToken,
      });
      g.__prisma = new PrismaClient({ adapter });
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
