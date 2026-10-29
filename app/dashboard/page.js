import Link from "next/link";
import { estimateState } from "@/lib/estimateState";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { VEHICLE_TYPES, STATUS_LABEL } from "@/lib/config";
import { fmtDate, money, prettyReg } from "@/lib/format";
import { cancelSubscription } from "@/app/actions";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }) {
  const user = await requireUser("/dashboard");
  const sp = await searchParams;
  const [vehicles, jobs, subs, unpaidBills] = await Promise.all([
    db.vehicle.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    db.job.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { vehicle: true, logs: { orderBy: { createdAt: "desc" }, take: 2 } },
      take: 20,
    }),
    db.subscription.findMany({ where: { userId: user.id, status: "ACTIVE", endsAt: { gt: new Date() } }, include: { plan: true } }),
    db.bill.findMany({
      where: { userId: user.id, paid: false },
      orderBy: { createdAt: "desc" },
      include: { vehicle: true },
    }),
  ]);
  const active = jobs.filter((j) => !["DELIVERED", "CANCELLED"].includes(j.status));
  const past = jobs.filter((j) => ["DELIVERED", "CANCELLED"].includes(j.status));
  const subByVehicle = Object.fromEntries(subs.map((s) => [s.vehicleId, s]));

  const estimateJobs = active.filter((j) => j.status === "BOOKED" || j.logs?.some((l) => l.note?.toLowerCase().includes("estimate")));

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1>Hi {user.name.split(" ")[0]} 👋</h1>
          {user.username && (
            <div className="muted small" style={{ marginTop: 2 }}>@{user.username}</div>
          )}
          {user.userCode && <div className="muted small">Customer ID: <span className="reg">{user.userCode}</span></div>}
        </div>
        <div className="row">
          <Link href="/profile" className="btn btn-ghost"><Icon name="user" size={18} /> My Profile</Link>
          <Link href="/vehicles/new" className="btn btn-ghost"><Icon name="plus" size={18} /> Add vehicle</Link>
          <Link href="/book" className="btn btn-primary"><Icon name="wrench" size={18} /> Book a service</Link>
        </div>
      </div>

      {sp.subscribed && <div className="alert ok">Plan activated for your vehicle. Our team will contact you to schedule the first visit.</div>}

      {/* ── Outstanding Bills Pay Now Section ── */}
      {unpaidBills.length > 0 && (
        <div
          style={{
            marginBottom: 28,
            background: "linear-gradient(135deg, #fff7ed, #fef3c7)",
            border: "2px solid #f59e0b",
            borderRadius: 18,
            padding: "20px 24px",
            boxShadow: "0 6px 24px rgba(245,158,11,0.14)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: "1.5rem" }}>💳</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "#92400e" }}>
                {unpaidBills.length === 1
                  ? "You have 1 bill awaiting payment"
                  : `You have ${unpaidBills.length} bills awaiting payment`}
              </div>
              <div style={{ fontSize: "0.82rem", color: "#b45309", marginTop: 2 }}>
                Outstanding total:{" "}
                <b style={{ fontFamily: "var(--mono)" }}>
                  {money(unpaidBills.reduce((a, b) => a + b.total, 0))}
                </b>
                {" "}— click Pay Now to settle any invoice instantly online.
              </div>
            </div>
            <Link href="/bills" className="btn btn-ghost btn-sm" style={{ borderColor: "#f59e0b", color: "#92400e" }}>
              View all bills
            </Link>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {unpaidBills.map((b) => (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                  background: "#ffffff",
                  borderRadius: 14,
                  padding: "14px 18px",
                  border: "1.5px solid #fde68a",
                  boxShadow: "0 2px 8px rgba(245,158,11,0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 200 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#fef3c7,#fde68a)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.1rem",
                      flexShrink: 0,
                    }}
                  >
                    🧾
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#1f2937" }}>
                      Invoice #{b.number}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                      {b.vehicle.make} {b.vehicle.model} · {fmtDate(b.createdAt)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.7rem", color: "#9ca3af", textTransform: "uppercase", fontWeight: 700 }}>Amount Due</div>
                    <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "#92400e", fontFamily: "var(--mono)" }}>
                      {money(b.total)}
                    </div>
                  </div>
                  <Link
                    href={`/bills/${b.id}#payment`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "11px 20px",
                      background: "linear-gradient(135deg, #d97706, #b45309)",
                      color: "#fff",
                      borderRadius: 12,
                      fontWeight: 900,
                      fontSize: "0.92rem",
                      textDecoration: "none",
                      boxShadow: "0 4px 16px rgba(180,83,9,0.35)",
                      whiteSpace: "nowrap",
                      transition: "opacity 0.15s",
                    }}
                  >
                    💳 Pay Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flashing Notification for Service Requests with Estimates */}
      {estimateJobs.map((j) => {
        const ownerQuoted = estimateState(j).quoted;
        const hasEstimate = ownerQuoted && (j.estMin > 0 || j.estMax > 0);
        return (
          <div
            key={j.id}
            className="notif-flash"
            style={{
              marginBottom: 22,
              background: hasEstimate
                ? "linear-gradient(135deg, rgba(200,69,43,0.08), rgba(200,69,43,0.02))"
                : "linear-gradient(135deg, #fef3c7, #fef9c3)",
              borderColor: hasEstimate ? "rgba(200,69,43,0.3)" : "#f59e0b",
            }}
          >
            <div className="row between" style={{ alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div className="row" style={{ gap: 12, alignItems: "center" }}>
                <span
                  className="pulse"
                  style={{ width: 14, height: 14, background: hasEstimate ? "var(--accent)" : "#d97706" }}
                />
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "1.05rem",
                      color: hasEstimate ? "var(--accent)" : "#b45309",
                    }}
                  >
                    {hasEstimate
                      ? `🔔 Service Estimate Ready — ${j.vehicle.make} ${j.vehicle.model} (${prettyReg(j.vehicle.regNo)})`
                      : `⏳ Estimate Pending — ${j.vehicle.make} ${j.vehicle.model} (${prettyReg(j.vehicle.regNo)})`}
                  </div>
                  <div className="small" style={{ marginTop: 2, color: hasEstimate ? "#3a3f49" : "#78350f" }}>
                    {hasEstimate ? (
                      <>
                        The garage owner quoted an estimate of <b>{money(j.estMin)}{j.estMin !== j.estMax ? ` – ${money(j.estMax)}` : ""}</b> for: <i>“{j.query}”</i>. Review the estimate to book or decline.
                      </>
                    ) : (
                      <>
                        Your request for <i>“{j.query}”</i> was submitted. The garage owner is reviewing it and will quote an estimated price with a note shortly.
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Link
                href={`/track/${j.id}`}
                className={`btn btn-sm ${hasEstimate ? "btn-primary" : "btn-dark"}`}
                style={{ boxShadow: hasEstimate ? "0 4px 14px rgba(200,69,43,0.35)" : "none", fontWeight: 700 }}
              >
                {hasEstimate ? "View Estimate & Book Service →" : "Track Request →"}
              </Link>
            </div>
          </div>
        );
      })}

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
                <div className="mono small" style={{ fontWeight: 600, color: "var(--accent)" }}>
                  Est: {money(j.estMin)}{j.estMin !== j.estMax ? ` – ${money(j.estMax)}` : ""}
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <Link href={`/track/${j.id}`} className="btn btn-ghost btn-sm">📅 Reschedule</Link>
                  <Link href={`/track/${j.id}`} className="btn btn-dark btn-sm">Track live</Link>
                </div>
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
