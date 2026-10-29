import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import StatusTracker from "@/components/StatusTracker";
import { submitReview } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params, searchParams }) {
  const sp = await searchParams;
  const { id } = await params;
  const user = await requireUser(`/track/${id}`);
  const job = await db.job.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      vehicle: true,
      items: true,
      logs: { orderBy: { createdAt: "asc" } },
      bills: { select: { id: true, total: true, discount: true, paid: true }, orderBy: { id: "desc" } },
    },
  });
  if (!job || (job.userId !== user.id && user.role !== "OWNER")) notFound();
  const review = job.status === "DELIVERED" && job.userId === user.id ? await db.review.findUnique({ where: { jobId: job.id } }) : null;

  const initial = {
    status: job.status,
    estMin: job.estMin,
    estMax: job.estMax,
    quotedAt: job.quotedAt ? job.quotedAt.toISOString() : null,
    acceptedAt: job.acceptedAt ? job.acceptedAt.toISOString() : null,
    ownerNote: job.ownerNote ?? null,
    items: job.items.map((i) => ({
      id: i.id,
      description: i.description,
      category: i.category,
      qty: i.qty,
      unitPrice: i.unitPrice,
    })),
    logs: job.logs.map((l) => ({ status: l.status, note: l.note, at: l.createdAt.toISOString() })),
    bill: job.bills[0] || null,
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Live tracking</span>
          <h1>{job.vehicle.make} {job.vehicle.model}</h1>
        </div>
        <Link href="/dashboard" className="btn btn-ghost">← Back to dashboard</Link>
      </div>
      <StatusTracker
        jobId={job.id}
        initial={initial}
        estMin={job.estMin}
        estMax={job.estMax}
        vehicleLabel={job.vehicle.regNo}
        query={job.query}
        code={job.code}
        jobItems={job.items.map((i) => ({
          id: i.id,
          description: i.description,
          category: i.category,
          qty: i.qty,
          unitPrice: i.unitPrice,
        }))}
      />
      {job.status === "DELIVERED" && job.userId === user.id && (
        <form action={submitReview} className="card" style={{ marginTop: 20, maxWidth: 520 }}>
          <input type="hidden" name="jobId" value={job.id} />
          <h3>{review ? "Your review" : "How did we do?"}</h3>
          {sp?.reviewed && <div className="alert ok">Thanks for your feedback!</div>}
          <div className="field">
            <label htmlFor="rating">Rating</label>
            <select id="rating" name="rating" defaultValue={review?.rating || 5}>
              <option value="5">★★★★★ Excellent</option>
              <option value="4">★★★★ Good</option>
              <option value="3">★★★ OK</option>
              <option value="2">★★ Poor</option>
              <option value="1">★ Bad</option>
            </select>
          </div>
          <div className="field"><label htmlFor="comment">Comment (optional)</label><textarea id="comment" name="comment" rows={3} maxLength={500} defaultValue={review?.comment || ""} /></div>
          <button className="btn btn-dark btn-sm">{review ? "Update review" : "Submit review"}</button>
        </form>
      )}
    </div>
  );
}
