import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { STATUS_LABEL, VEHICLE_TYPES } from "@/lib/config";
import { fmtDate, money, prettyReg } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OwnerVehicle({ params }) {
  const { id } = await params;
  const v = await db.vehicle.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      user: true,
      jobs: { orderBy: { createdAt: "desc" } },
      bills: { orderBy: { createdAt: "desc" } },
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!v) notFound();
  const spent = v.bills.reduce((a, b) => a + b.total, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Vehicle record</span>
          <h1>{v.make} {v.model} <span className="reg" style={{ fontSize: "1rem", verticalAlign: "middle" }}>{prettyReg(v.regNo)}</span></h1>
          <div className="muted">{v.year} · {VEHICLE_TYPES[v.type]?.label} · {v.fuel.toLowerCase()} · {v.odometer.toLocaleString("en-US")} km</div>
        </div>
        <Link href={`/owner/bills/new?userId=${v.userId}&vehicleId=${v.id}`} className="btn btn-primary">Generate bill</Link>
      </div>
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="card kpi"><div className="label">Owner</div><div className="value" style={{ fontSize: "1.2rem" }}>{v.user.name}</div><div className="sub">{v.user.phone} · {v.user.email}</div></div>
        <div className="card kpi"><div className="label">Visits</div><div className="value">{v.jobs.length}</div></div>
        <div className="card kpi"><div className="label">Lifetime spend</div><div className="value">{money(spent)}</div></div>
      </div>
      {v.subscriptions.filter((s) => s.status === "ACTIVE" && s.endsAt > new Date()).map((s) => (
        <div className="alert ok" key={s.id}>Active plan: <b>{s.plan.name} ({s.plan.period.toLowerCase()})</b> until {fmtDate(s.endsAt)}</div>
      ))}
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3>Service history</h3>
          {v.jobs.length === 0 && <div className="empty">No jobs.</div>}
          {v.jobs.map((j) => (
            <div className="job-row" key={j.id}>
              <div className="grow"><b>{j.code}</b> <span className="muted small">· {fmtDate(j.createdAt)}</span><div className="muted small">{j.query}</div></div>
              <span className={`badge ${j.status}`}>{STATUS_LABEL[j.status]}</span>
              <Link href={`/owner/jobs/${j.id}`} className="btn btn-ghost btn-sm">Open</Link>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Bills</h3>
          {v.bills.length === 0 && <div className="empty">No bills.</div>}
          {v.bills.map((b) => (
            <div className="job-row" key={b.id}>
              <div className="grow"><b>{b.number}</b> <span className="muted small">· {fmtDate(b.createdAt)}</span></div>
              <b>{money(b.total)}</b>
              <span className={`badge ${b.paid ? "paid" : "unpaid"}`}>{b.paid ? "Paid" : "Due"}</span>
              <Link href={`/owner/bills/${b.id}`} className="btn btn-ghost btn-sm">Open</Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
