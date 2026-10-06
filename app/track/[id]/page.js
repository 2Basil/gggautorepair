import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import StatusTracker from "@/components/StatusTracker";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }) {
  const { id } = await params;
  const user = await requireUser(`/track/${id}`);
  const job = await db.job.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      vehicle: true,
      items: true,
      logs: { orderBy: { createdAt: "asc" } },
      bills: { select: { id: true, total: true, paid: true }, orderBy: { id: "desc" } },
    },
  });
  if (!job || (job.userId !== user.id && user.role !== "OWNER")) notFound();

  const initial = {
    status: job.status,
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
        jobItems={job.items.map((i) => ({ description: i.description }))}
      />
    </div>
  );
}
