import Link from "next/link";
import { db } from "@/lib/db";
import { VEHICLE_TYPES } from "@/lib/config";
import { fmtDate, money } from "@/lib/format";
import { ledgerWhere } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export default async function Ledger({ searchParams }) {
  const sp = await searchParams;
  const { where, type, q, from, to } = ledgerWhere(sp);
  const rows = await db.billItem.findMany({
    where,
    include: { bill: { include: { vehicle: { select: { type: true, regNo: true } }, user: { select: { name: true } } } } },
    orderBy: { bill: { createdAt: "desc" } },
    take: 500,
  });
  const total = rows.reduce((a, r) => a + r.qty * r.unitPrice, 0);
  const qs = new URLSearchParams(Object.entries({ type, q, from, to }).filter(([, v]) => v)).toString();

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal · 4</span>
          <h1>Ledger</h1>
          <div className="muted">Built automatically from every bill: vehicle type, service and charge.</div>
        </div>
        <a href={`/owner/ledger/export${qs ? `?${qs}` : ""}`} className="btn btn-dark">Download CSV</a>
      </div>

      <form className="searchbar" method="get" style={{ flexWrap: "wrap" }}>
        <select name="type" defaultValue={type} style={{ maxWidth: 190 }}>
          <option value="">All vehicle types</option>
          {Object.entries(VEHICLE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input name="q" defaultValue={q} placeholder="Search service, bill no. or customer…" />
        <input name="from" type="date" defaultValue={from} style={{ maxWidth: 160 }} />
        <input name="to" type="date" defaultValue={to} style={{ maxWidth: 160 }} />
        <button className="btn btn-dark">Filter</button>
        {(type || q || from || to) && <Link href="/owner/ledger" className="btn btn-ghost">Clear</Link>}
      </form>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Date</th><th>Bill</th><th>Customer</th><th>Type of vehicle</th><th>Service</th><th className="num">Charge</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.bill.createdAt)}</td>
                <td><Link href={`/owner/bills/${r.billId}`}><b>{r.bill.number}</b></Link></td>
                <td>{r.bill.user.name}</td>
                <td>{VEHICLE_TYPES[r.bill.vehicle.type]?.label || r.bill.vehicle.type}</td>
                <td>{r.description}{r.qty > 1 ? <span className="muted small"> × {r.qty}</span> : null}</td>
                <td className="num mono">{money(r.qty * r.unitPrice)}</td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr><td colSpan={5} className="right"><b>Total (before tax){rows.length === 500 ? " — latest 500 rows" : ""}</b></td><td className="num mono"><b>{money(total)}</b></td></tr>
            )}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">No ledger entries yet. They appear automatically when you generate bills.</div>}
      </div>
    </>
  );
}
