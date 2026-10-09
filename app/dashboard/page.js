import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { VEHICLE_TYPES, STATUS_LABEL } from "@/lib/config";
import { fmtDate, prettyReg } from "@/lib/format";
import { cancelSubscription } from "@/app/actions";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }) {
  const user = await requireUser("/dashboard");
  const sp = await searchParams;
  const [vehicles, jobs, subs] = await Promise.all([
    db.vehicle.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    db.job.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { vehicle: true }, take: 20 }),
    db.subscription.findMany({ where: { userId: user.id, status: "ACTIVE", endsAt: { gt: new Date() } }, include: { plan: true } }),
  ]);
  const active = jobs.filter((j) => !["DELIVERED", "CANCELLED"].includes(j.status));
  const past = jobs.filter((j) => ["DELIVERED", "CANCELLED"].includes(j.status));
  const subByVehicle = Object.fromEntries(subs.map((s) => [s.vehicleId, s]));

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1>Hi {user.name.split(" ")[0]} 👋</h1>
          {user.userCode && <div className="muted small">Customer ID: <span className="reg">{user.userCode}</span></div>}
        </div>
        <div className="row">
          <Link href="/vehicles/new" className="btn btn-ghost"><Icon name="plus" size={18} /> Add vehicle</Link>
          <Link href="/book" className="btn btn-primary"><Icon name="wrench" size={18} /> Book a service</Link>
        </div>
      </div>

      {sp.subscribed && <div className="alert ok">Plan activated for your vehicle. Our team will contact you to schedule the first visit.</div>}

      {active.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: "1.3rem" }}>In the garage now</h2>
          <div className="card">
            {active.map((j) => (
              <div className="job-row" key={j.id}>
                <div className="grow">
                  <b>{j.vehicle.make} {j.vehicle.model}</b> <span className="reg">{prettyReg(j.vehicle.regNo)}</span>
                  <div className="muted small">{j.query}</div>
                </div>
                <span className={`badge ${j.status}`}>{STATUS_LABEL[j.status]}</span>
                <Link href={`/track/${j.id}`} className="btn btn-dark btn-sm">Track live</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <h2 style={{ fontSize: "1.3rem" }}>My vehicles</h2>
      <div className="grid grid-3" style={{ marginBottom: 28 }}>
        {vehicles.map((v) => {
          const sub = subByVehicle[v.id];
          return (
            <div className="card vehicle-card" key={v.id}>
              <div className="top">
                <span className="reg">{prettyReg(v.regNo)}</span>
                {sub ? <span className="badge paid">{sub.plan.name} · {sub.plan.period === "YEARLY" ? "Yearly" : "Monthly"}</span> : <span className="badge">No plan</span>}
              </div>
              <h3>{v.make} {v.model}</h3>
              <div className="muted small">{v.year} · {VEHICLE_TYPES[v.type]?.label} · {v.fuel[0] + v.fuel.slice(1).toLowerCase()}{v.color ? ` · ${v.color}` : ""}</div>
              <dl className="kv">
                <dt>Odometer</dt><dd>{v.odometer.toLocaleString("en-US")} km</dd>
                {sub && (<><dt>Plan ends</dt><dd>{fmtDate(sub.endsAt)}</dd></>)}
              </dl>
              <div className="row">
                <Link href={`/vehicles/${v.id}`} className="btn btn-ghost btn-sm">History</Link>
                <Link href={`/book?vehicle=${v.id}`} className="btn btn-primary btn-sm">Book service</Link>
                {!sub && <Link href="/plans" className="btn-link small">Add plan</Link>}
              </div>
              {sub && (
                <form action={cancelSubscription} style={{ marginTop: 10 }}>
                  <input type="hidden" name="id" value={sub.id} />
                  <button className="btn-link danger tiny">Cancel plan</button>
                </form>
              )}
            </div>
          );
        })}
        <Link href="/vehicles/new" className="card flat center" style={{ display: "grid", placeItems: "center", minHeight: 200, borderStyle: "dashed" }}>
          <div>
            <Icon name="plus" size={30} />
            <div style={{ fontWeight: 600, marginTop: 6 }}>Add another vehicle</div>
          </div>
        </Link>
      </div>

      <h2 style={{ fontSize: "1.3rem" }}>Past services</h2>
      <div className="card">
        {past.length === 0 && <div className="empty">No completed services yet.</div>}
        {past.map((j) => (
          <div className="job-row" key={j.id}>
            <div className="grow">
              <b>{j.vehicle.make} {j.vehicle.model}</b> · <span className="muted small">{j.code} · {fmtDate(j.createdAt)}</span>
              <div className="muted small">{j.query}</div>
            </div>
            <span className={`badge ${j.status}`}>{STATUS_LABEL[j.status]}</span>
            <Link href={`/track/${j.id}`} className="btn btn-ghost btn-sm">Details</Link>
          </div>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 14 }}>All amounts are in US dollars ($). Estimates may change after inspection; you always see the final bill before pick-up.</p>
    </div>
  );
}
