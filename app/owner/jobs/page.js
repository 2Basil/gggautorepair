import Link from "next/link";
import { db } from "@/lib/db";
import { STATUS_LABEL, STATUS_KEYS } from "@/lib/config";
import { fmtDate, inr, prettyReg } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OwnerJobs({ searchParams }) {
  const sp = await searchParams;
  const status = STATUS_KEYS.includes(sp.status) ? sp.status : "";
  const jobs = await db.job.findMany({
    where: status ? { status } : {},
    include: { user: true, vehicle: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>Jobs</h1>
        </div>
      </div>
      <div className="tabs" style={{ flexWrap: "wrap" }}>
        <Link href="/owner/jobs" className={!status ? "on" : ""}>All</Link>
        {STATUS_KEYS.map((k) => (
          <Link key={k} href={`/owner/jobs?status=${k}`} className={status === k ? "on" : ""}>{STATUS_LABEL[k]}</Link>
        ))}
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Job</th><th>Date</th><th>Vehicle</th><th>Customer</th><th>Request</th><th className="num">Estimate</th><th>Status</th><th /></tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td><b>{j.code}</b></td>
                <td>{fmtDate(j.createdAt)}</td>
                <td>{j.vehicle.make} {j.vehicle.model}<div><span className="reg">{prettyReg(j.vehicle.regNo)}</span></div></td>
                <td>{j.user.name}<div className="muted small">{j.user.phone}</div></td>
                <td className="muted small" style={{ maxWidth: 220 }}>{j.query}</td>
                <td className="num mono nowrap">{inr(j.estMin)}–{inr(j.estMax)}</td>
                <td><span className={`badge ${j.status}`}>{STATUS_LABEL[j.status]}</span></td>
                <td className="right"><Link href={`/owner/jobs/${j.id}`} className="btn btn-dark btn-sm">Manage</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && <div className="empty">No jobs here.</div>}
      </div>
    </>
  );
}
