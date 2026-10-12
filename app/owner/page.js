import { requireOwner } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db";
import { STATUS_LABEL, STEPS } from "@/lib/config";
import { fmtDate, money, prettyReg } from "@/lib/format";
import { sendJobEstimate } from "@/app/actions";
import ContactButtons from "@/components/ContactButtons";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function OwnerHome() {
  await requireOwner();
  const now = new Date();
  const [bills, billItems, jobs, customers, vehicles, subs, recentJobs] = await Promise.all([
    db.bill.findMany({ select: { total: true, paid: true, createdAt: true } }),
    db.billItem.findMany({ select: { description: true, category: true, qty: true, unitPrice: true } }),
    db.job.findMany({ select: { status: true } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.vehicle.findMany({ select: { make: true } }),
    db.subscription.findMany({ where: { status: "ACTIVE", endsAt: { gt: now } }, include: { plan: true } }),
    db.job.findMany({
      where: { status: { in: ["BOOKED", "REPAIRING", "REPAIRED", "TESTING", "READY"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { vehicle: true, user: true, items: true, logs: { orderBy: { createdAt: "desc" }, take: 2 } },
    }),
  ]);

  // revenue by month (last 6)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], total: 0 };
  });
  for (const b of bills) {
    const d = new Date(b.createdAt);
    const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.total += b.total;
  }
  const maxM = Math.max(1, ...months.map((m) => m.total));
  const total = bills.reduce((a, b) => a + b.total, 0);
  const thisMonth = months[5].total;
  const due = bills.filter((b) => !b.paid).reduce((a, b) => a + b.total, 0);
  const active = jobs.filter((j) => !["DELIVERED", "CANCELLED"].includes(j.status)).length;

  const byCat = {};
  const bySvc = {};
  for (const i of billItems) {
    const amt = i.qty * i.unitPrice;
    byCat[i.category] = (byCat[i.category] || 0) + amt;
    bySvc[i.description] = (bySvc[i.description] || 0) + amt;
  }
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const svcs = Object.entries(bySvc).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const catMax = Math.max(1, ...cats.map((c) => c[1]));
  const svcMax = Math.max(1, ...svcs.map((c) => c[1]));

  const statusCount = Object.fromEntries(STEPS.map((s) => [s.key, 0]));
  jobs.forEach((j) => { if (statusCount[j.status] !== undefined) statusCount[j.status]++; });

  const makes = {};
  vehicles.forEach((v) => (makes[v.make] = (makes[v.make] || 0) + 1));
  const makeList = Object.entries(makes).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const makeMax = Math.max(1, ...makeList.map((m) => m[1]));
  const subRevenue = subs.reduce((a, s) => a + (s.plan.period === "YEARLY" ? Math.round(s.plan.price / 12) : s.plan.price), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>Garage analytics</h1>
        </div>
        <Link href="/owner/bills/new" className="btn btn-primary">Generate bill</Link>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="card kpi"><div className="label">Revenue this month</div><div className="value">{money(thisMonth)}</div><div className="sub">All time {money(total)}</div></div>
        <div className="card kpi"><div className="label">Outstanding</div><div className="value">{money(due)}</div><div className="sub">{bills.filter((b) => !b.paid).length} unpaid bills</div></div>
        <div className="card kpi"><div className="label">Active jobs</div><div className="value">{active}</div><div className="sub">{jobs.length} jobs overall</div></div>
        <div className="card kpi"><div className="label">Customers</div><div className="value">{customers}</div><div className="sub">{vehicles.length} vehicles · {subs.length} active plans</div></div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <h3>Revenue, last 6 months</h3>
          <div className="bars">
            {months.map((m) => (
              <div className="bar-col" key={m.key}>
                <b>{m.total ? money(Math.round(m.total / 1000)) + "k" : "–"}</b>
                <div className="bar" style={{ height: `${(m.total / maxM) * 100 * 0.78}%` }} />
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Revenue by category</h3>
          {cats.length === 0 && <div className="empty">No billed work yet.</div>}
          {cats.map(([name, v]) => (
            <div className="hbar" key={name}>
              <span className="name">{name}</span>
              <div className="track"><div className="fill" style={{ width: `${(v / catMax) * 100}%` }} /></div>
              <b className="mono">{money(v)}</b>
            </div>
          ))}
          <hr className="divider" />
          <div className="muted small">Plan subscriptions add roughly <b>{money(subRevenue)}</b> per month in recurring revenue.</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <h3>Top services</h3>
          {svcs.map(([name, v]) => (
            <div className="hbar" key={name}>
              <span className="name" title={name}>{name}</span>
              <div className="track"><div className="fill" style={{ width: `${(v / svcMax) * 100}%`, background: "var(--accent)" }} /></div>
              <b className="mono">{money(v)}</b>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Vehicles by make</h3>
          {makeList.map(([name, n]) => (
            <div className="hbar" key={name}>
              <span className="name">{name}</span>
              <div className="track"><div className="fill" style={{ width: `${(n / makeMax) * 100}%`, background: "var(--brass)" }} /></div>
              <b>{n}</b>
            </div>
          ))}
          <hr className="divider" />
          <h3 style={{ fontSize: "1rem" }}>Jobs by stage</h3>
          <div className="row">
            {STEPS.map((s) => (
              <span key={s.key} className={`badge ${s.key}`}>{s.label}: {statusCount[s.key]}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row between" style={{ alignItems: "baseline", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0 }}>Customer service requests &amp; live estimates</h3>
            <p className="muted small" style={{ margin: "4px 0 0" }}>
              Send or adjust estimate prices here. Sending an estimate instantly flashes a notification on the customer’s page so they bring their vehicle in.
            </p>
          </div>
          <Link href="/owner/jobs" className="btn-link small">All jobs →</Link>
        </div>

        {recentJobs.length === 0 && <div className="empty">All caught up. No active service requests.</div>}

        <div style={{ display: "grid", gap: 18 }}>
          {recentJobs.map((j) => (
            <div
              key={j.id}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: "16px 18px",
                background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div className="row between" style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <div>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <b style={{ fontSize: "1.05rem" }}>{j.code}</b>
                    <span className="reg">{prettyReg(j.vehicle.regNo)}</span>
                    <span style={{ fontWeight: 600 }}>{j.vehicle.make} {j.vehicle.model}</span>
                    <span className={`badge ${j.status}`}>{STATUS_LABEL[j.status]}</span>
                  </div>
                  <div className="muted small" style={{ marginTop: 4 }}>
                    Customer: <b>{j.user.name}</b> · {j.user.phone} · Booked {fmtDate(j.createdAt)}
                  </div>
                </div>

                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <ContactButtons
                    phone={j.user.phone}
                    email={j.user.email}
                    subject={`Service Request ${j.code}`}
                    text={`Hello ${j.user.name}, this is ZZZ AUTO REPAIR regarding your request ${j.code} for your ${j.vehicle.make} ${j.vehicle.model}.`}
                  />
                  <Link href={`/owner/jobs/${j.id}`} className="btn btn-dark btn-sm">
                    Manage &amp; Add Charges →
                  </Link>
                </div>
              </div>

              {/* Customer query */}
              <div style={{ background: "var(--cream)", padding: "10px 14px", borderRadius: 10, marginBottom: 12 }}>
                <span className="tiny muted uppercase" style={{ fontWeight: 700, letterSpacing: "0.05em" }}>Customer Request:</span>
                <div style={{ fontSize: "0.95rem", marginTop: 2 }}>“{j.query}”</div>
              </div>

              {/* Estimate form & current charges */}
              <div className="row between" style={{ alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div className="row" style={{ gap: 12, alignItems: "center" }}>
                  <div>
                    <span className="tiny muted uppercase" style={{ fontWeight: 700 }}>Current Estimate:</span>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)" }}>
                      {money(j.estMin)}{j.estMin !== j.estMax ? ` – ${money(j.estMax)}` : ""}
                    </div>
                  </div>
                  {j.items.length > 0 && (
                    <div style={{ borderLeft: "1px solid var(--line)", paddingLeft: 12 }}>
                      <span className="tiny muted uppercase" style={{ fontWeight: 700 }}>Work charges logged:</span>
                      <div className="mono" style={{ fontWeight: 600 }}>
                        {money(j.items.reduce((s, it) => s + (it.qty || 1) * (it.unitPrice || 0), 0))} ({j.items.length} items)
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick send estimate form */}
                <form action={sendJobEstimate} className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input type="hidden" name="jobId" value={j.id} />
                  <input
                    type="number"
                    name="estMin"
                    defaultValue={j.estMin}
                    placeholder="Min $"
                    style={{ width: 90, padding: "7px 10px", fontSize: "0.88rem" }}
                    title="Minimum estimated price"
                    required
                  />
                  <input
                    type="number"
                    name="estMax"
                    defaultValue={j.estMax}
                    placeholder="Max $"
                    style={{ width: 90, padding: "7px 10px", fontSize: "0.88rem" }}
                    title="Maximum estimated price (or same as Min)"
                  />
                  <input
                    name="note"
                    placeholder="Note (e.g. Bring vehicle at 10 AM)"
                    defaultValue="Estimate sent. Please bring your vehicle to the garage."
                    style={{ minWidth: 200, maxWidth: 320, padding: "7px 10px", fontSize: "0.88rem" }}
                  />
                  <button className="btn btn-primary btn-sm" title="Sends estimate and flashes notification on customer dashboard">
                    Send estimate 🔔
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
