import { db } from "./db";

// Best-effort audit trail of staff actions (never breaks the real action).
export async function logActivity(actor, action, detail) {
  try {
    await db.activityLog.create({
      data: { actorId: actor?.id ?? null, actorName: actor?.name ?? null, action, detail: detail ? String(detail).slice(0, 300) : null },
    });
  } catch {
    /* table may not exist yet */
  }
}
