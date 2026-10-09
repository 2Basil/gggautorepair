import Link from "next/link";
import { db } from "@/lib/db";
import { STATUS_LABEL, STEPS } from "@/lib/config";
import { fmtDate, money, prettyReg } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function OwnerHome() {
  const now = new Date();
  const [bills, billItems, jobs, customers, vehicles, subs, recentJobs] = await Promise.all([
    db.bill.findMany({ select: { total: true, paid: true, createdAt: true } }),
    db.billItem.findMany({ select: { description: true, category: true, qty: true, unitPrice: true } }),
    db.job.findMany({ select: { status: true } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.vehicle.findMany({ select: { make: true } }),
    db.subscription.findMany({ where: { status: "ACTIVE", endsAt: { gt: now } }, include: { plan: true } }),
    db.job.findMany({ where: { status: { in: ["BOOKED", "REPAIRING", "REPAIRED", "TESTING", "READY"] } }, orderBy: { createdAt: "desc" }, take: 6, include: { vehicle: true, user: true } }),
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
        <div className="row between"><h3>Needs attention</h3><Link href="/owner/jobs" className="btn-link small">All jobs →</Link></div>
        {recentJobs.length === 0 && <div className="empty">All caught up.</div>}
        {recentJobs.map((j) => (
          <div className="job-row" key={j.id}>
            <div className="grow">
              <b>{j.code}</b> · {j.vehicle.make} {j.vehicle.model} <span className="reg">{prettyReg(j.vehicle.regNo)}</span>
              <div className="muted small">{j.user.name} · {fmtDate(j.createdAt)} · {j.query}</div>
            </div>
            <span className={`badge ${j.status}`}>{STATUS_LABEL[j.status]}</span>
            <Link href={`/owner/jobs/${j.id}`} className="btn btn-dark btn-sm">Open</Link>
          </div>
        ))}
      </div>
    </>
  );
}
