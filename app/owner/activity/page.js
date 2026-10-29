import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import Pager from "@/components/Pager";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Activity({ searchParams }) {
  await requireOwner();
  const sp = await searchParams;
  const PAGE = 30;
  const page = Math.max(1, parseInt(sp.page, 10) || 1);
  const [rows, total, reviews, avg] = await Promise.all([
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.activityLog.count(),
    db.review.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    db.review.aggregate({ _avg: { rating: true }, _count: true }),
  ]);
  const users = await db.user.findMany({ where: { id: { in: reviews.map((r) => r.userId) } }, select: { id: true, name: true } });
  const jobs = await db.job.findMany({ where: { id: { in: reviews.map((r) => r.jobId) } }, select: { id: true, code: true } });
  const uName = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const jCode = Object.fromEntries(jobs.map((j) => [j.id, j.code]));

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>Activity &amp; reviews</h1>
          <div className="muted">Who did what in the portal, and what customers say after a job.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Customer reviews {avg._count > 0 && <span className="muted small">· {avg._avg.rating.toFixed(1)} / 5 from {avg._count}</span>}</h3>
        {reviews.length === 0 && <div className="empty">No reviews yet.</div>}
        {reviews.map((r) => (
          <div className="job-row" key={r.id}>
            <div className="grow">
              <b>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</b> <span className="muted small">· {uName[r.userId] || "Customer"} · {jCode[r.jobId] || ""} · {fmtDateTime(r.createdAt)}</span>
              {r.comment && <div className="muted small">{r.comment}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{fmtDateTime(r.createdAt)}</td><td>{r.actorName || "—"}</td><td><span className="badge">{r.action}</span></td><td>{r.detail}</td></tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">Nothing logged yet.</div>}
      </div>
      <Pager basePath="/owner/activity" page={page} pageSize={PAGE} total={total} />
    </>
  );
}
