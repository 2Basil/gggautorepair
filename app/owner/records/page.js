import Link from "next/link";
import { db } from "@/lib/db";
import { STATUS_LABEL, VEHICLE_TYPES } from "@/lib/config";
import { fmtDate, money, prettyReg, normReg } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Records({ searchParams }) {
  const sp = await searchParams;
  const tab = ["vehicles", "jobs", "bills", "customers"].includes(sp.tab) ? sp.tab : "vehicles";
  const q = String(sp.q || "").trim();
  const reg = normReg(q);

  let rows = [];
  if (tab === "vehicles") {
    rows = await db.vehicle.findMany({
      where: q
        ? { OR: [{ regNo: { contains: reg || q } }, { make: { contains: q } }, { model: { contains: q } }, { user: { name: { contains: q } } }, { user: { phone: { contains: q } } }, { user: { email: { contains: q } } }] }
        : {},
      include: { user: true, jobs: { select: { createdAt: true }, orderBy: { createdAt: "desc" } }, bills: { select: { total: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } else if (tab === "jobs") {
    rows = await db.job.findMany({
      where: q
        ? { OR: [{ code: { contains: q } }, { query: { contains: q } }, { vehicle: { regNo: { contains: reg || q } } }, { user: { name: { contains: q } } }] }
        : {},
      include: { user: true, vehicle: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } else if (tab === "bills") {
    rows = await db.bill.findMany({
      where: q
        ? { OR: [{ number: { contains: q } }, { vehicle: { regNo: { contains: reg || q } } }, { user: { name: { contains: q } } }, { user: { phone: { contains: q } } }] }
        : {},
      include: { user: true, vehicle: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } else {
    rows = await db.user.findMany({
      where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }, { userCode: { contains: q.toUpperCase() } }] } : {},
      include: { vehicles: { select: { regNo: true } }, bills: { select: { total: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  const tabLink = (t, label) => (
    <Link key={t} href={`/owner/records?tab=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={tab === t ? "on" : ""}>{label}</Link>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>Records</h1>
        </div>
      </div>
      <div className="tabs">
        {tabLink("vehicles", "Vehicles")}
        {tabLink("jobs", "Jobs")}
        {tabLink("bills", "Bills")}
        {tabLink("customers", "Customers")}
      </div>
      <form className="searchbar" method="get">
        <input type="hidden" name="tab" value={tab} />
        <input name="q" defaultValue={q} placeholder={tab === "vehicles" ? "Search reg. number, make, model, customer name or phone…" : "Search by name, phone, customer ID, reg. number or code…"} />
        <button className="btn btn-dark">Search</button>
        {q && <Link href={`/owner/records?tab=${tab}`} className="btn btn-ghost">Clear</Link>}
      </form>

      <div className="table-wrap">
        <table className="tbl">
          {tab === "vehicles" && (
            <>
              <thead><tr><th>Reg. no</th><th>Vehicle</th><th>Owner</th><th>Last visit</th><th className="num">Visits</th><th className="num">Lifetime spend</th><th /></tr></thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id}>
                    <td><span className="reg">{prettyReg(v.regNo)}</span></td>
                    <td><b>{v.make} {v.model}</b><div className="muted small">{v.year} · {VEHICLE_TYPES[v.type]?.label}</div></td>
                    <td>{v.user.name}<div className="muted small">{v.user.phone}</div></td>
                    <td>{v.jobs[0] ? fmtDate(v.jobs[0].createdAt) : "—"}</td>
                    <td className="num">{v.jobs.length}</td>
                    <td className="num mono">{money(v.bills.reduce((a, b) => a + b.total, 0))}</td>
                    <td className="right"><Link href={`/owner/vehicles/${v.id}`} className="btn btn-ghost btn-sm">History</Link></td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
          {tab === "jobs" && (
            <>
              <thead><tr><th>Job</th><th>Date</th><th>Vehicle</th><th>Customer</th><th>Request</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((j) => (
                  <tr key={j.id}>
                    <td><b>{j.code}</b></td>
                    <td>{fmtDate(j.createdAt)}</td>
                    <td><span className="reg">{prettyReg(j.vehicle.regNo)}</span></td>
                    <td>{j.user.name}</td>
                    <td style={{ maxWidth: 240 }} className="muted small">{j.query}</td>
                    <td><span className={`badge ${j.status}`}>{STATUS_LABEL[j.status]}</span></td>
                    <td className="right"><Link href={`/owner/jobs/${j.id}`} className="btn btn-ghost btn-sm">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
          {tab === "bills" && (
            <>
              <thead><tr><th>Bill</th><th>Date</th><th>Customer</th><th>Vehicle</th><th className="num">Total</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id}>
                    <td><b>{b.number}</b></td>
                    <td>{fmtDate(b.createdAt)}</td>
                    <td>{b.user.name}</td>
                    <td><span className="reg">{prettyReg(b.vehicle.regNo)}</span></td>
                    <td className="num mono"><b>{money(b.total)}</b></td>
                    <td><span className={`badge ${b.paid ? "paid" : "unpaid"}`}>{b.paid ? "Paid" : "Due"}</span></td>
                    <td className="right"><Link href={`/owner/bills/${b.id}`} className="btn btn-ghost btn-sm">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
          {tab === "customers" && (
            <>
              <thead><tr><th>Customer</th><th>Customer ID</th><th>Contact</th><th>Vehicles</th><th>Joined</th><th className="num">Lifetime spend</th><th>Role</th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.name}</b><div className="muted small">{u.city || ""}</div></td>
                    <td>{u.userCode ? <span className="reg">{u.userCode}</span> : "—"}</td>
                    <td>{u.phone}{u.phoneVerified && <span className="tiny muted"> ✓ verified</span>}<div className="muted small">{u.email}</div></td>
                    <td>{u.vehicles.map((v) => <span className="reg" style={{ marginRight: 4 }} key={v.regNo}>{prettyReg(v.regNo)}</span>)}</td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td className="num mono">{money(u.bills.reduce((a, b) => a + b.total, 0))}</td>
                    <td><span className={`badge ${u.role}`}>{u.role === "OWNER" ? "Owner" : "Customer"}</span></td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
        {rows.length === 0 && <div className="empty">No records found{q ? ` for “${q}”` : ""}.</div>}
      </div>
      <p className="muted tiny" style={{ marginTop: 8 }}>Showing up to 100 most recent results.</p>
    </>
  );
}
