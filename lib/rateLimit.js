import { db } from "./db";

// DB-backed fixed-window limiter (works across serverless instances).
// tooMany(): true when `key` already used up `max` hits in the current window.
export async function tooMany(key, max) {
  try {
    const row = await db.rateLimit.findUnique({ where: { key } });
    if (!row || row.resetAt < new Date()) return false;
    return row.count >= max;
  } catch {
    return false; // never lock everyone out if the table is missing
  }
}

export async function recordHit(key, windowSec) {
  try {
    const now = new Date();
    const row = await db.rateLimit.findUnique({ where: { key } });
    if (!row || row.resetAt < now) {
      await db.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt: new Date(now.getTime() + windowSec * 1000) },
        update: { count: 1, resetAt: new Date(now.getTime() + windowSec * 1000) },
      });
    } else {
      await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    }
  } catch {
    /* best effort */
  }
}

export async function clearHits(key) {
  try { await db.rateLimit.delete({ where: { key } }); } catch { /* none */ }
}
