import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { VEHICLE_TYPES, STATUS_LABEL } from "@/lib/config";
import { fmtDate, inr, prettyReg } from "@/lib/format";
import { updateOdometer } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function VehiclePage({ params }) {
  const { id } = await params;
  const user = await requireUser(`/vehicles/${id}`);
  const v = await db.vehicle.findUnique({
    where: { id: Number(id) || 0 },
    include: { jobs: { orderBy: { createdAt: "desc" } }, bills: { orderBy: { createdAt: "desc" } } },
  });
  if (!v || (v.userId !== user.id && user.role !== "OWNER")) notFound();
  const spent = v.bills.reduce((a, b) => a + b.total, 0);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Vehicle history</span>
          <h1>{v.make} {v.model} <span className="reg" style={{ fontSize: "1rem", verticalAlign: "middle" }}>{prettyReg(v.regNo)}</span></h1>
          <div className="muted">{v.year} · {VEHICLE_TYPES[v.type]?.label} · {v.fuel.toLowerCase()} · {v.odometer.toLocaleString("en-IN")} km · lifetime spend {inr(spent)}</div>
        </div>
        <Link href={`/book?vehicle=${v.id}`} className="btn btn-primary">Book a service</Link>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3>Services</h3>
          {v.jobs.length === 0 && <div className="empty">No services yet.</div>}
          {v.jobs.map((j) => (
            <div className="job-row" key={j.id}>
              <div className="grow"><b>{j.code}</b> <span className="muted small">· {fmtDate(j.createdAt)}</span><div className="muted small">{j.query}</div></div>
              <span className={`badge ${j.status}`}>{STATUS_LABEL[j.status]}</span>
              <Link href={`/track/${j.id}`} className="btn btn-ghost btn-sm">View</Link>
            </div>
          ))}
        </div>
        <div className="stack">
          <div className="card">
            <h3>Bills</h3>
            {v.bills.length === 0 && <div className="empty">No bills yet.</div>}
            {v.bills.map((b) => (
              <div className="job-row" key={b.id}>
                <div className="grow"><b>{b.number}</b> <span className="muted small">· {fmtDate(b.createdAt)}</span></div>
                <b>{inr(b.total)}</b>
                <span className={`badge ${b.paid ? "paid" : "unpaid"}`}>{b.paid ? "Paid" : "Due"}</span>
                <Link href={`/bills/${b.id}`} className="btn btn-ghost btn-sm">Open</Link>
              </div>
            ))}
          </div>
          <form action={updateOdometer} className="card">
            <h3>Update odometer</h3>
            <input type="hidden" name="vehicleId" value={v.id} />
            <div className="row">
              <input name="odometer" type="number" min="0" defaultValue={v.odometer} style={{ maxWidth: 200 }} />
              <button className="btn btn-dark btn-sm">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
