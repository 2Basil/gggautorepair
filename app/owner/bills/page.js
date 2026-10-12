import Link from "next/link";
import { db } from "@/lib/db";
import ShareBill from "@/components/ShareBill";
import { fmtDate, money, prettyReg, normReg } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OwnerBills({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp.q || "").trim();
  const reg = normReg(q);

  const where = q
    ? {
        OR: [
          { number: { contains: q } },
          { user: { name: { contains: q } } },
          { user: { phone: { contains: q } } },
          { vehicle: { regNo: { contains: reg || q } } },
        ],
      }
    : {};

  const bills = await db.bill.findMany({
    where,
    include: { user: true, vehicle: true },
    orderBy: { createdAt: "desc" },
    take: 150,
  });
  const due = bills.filter((b) => !b.paid).reduce((a, b) => a + b.total, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>Bills &amp; Invoices</h1>
          <div className="muted">
            Searchable bills database. Total outstanding: <b>{money(due)}</b>
          </div>
        </div>
        <Link href="/owner/bills/new" className="btn btn-primary">Generate new bill</Link>
      </div>

      {/* Serial Number & Customer Search Bar */}
      <form className="searchbar" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by Bill Serial Number (e.g. INV-0001), Customer Name, Phone, or Reg No…"
        />
        <button className="btn btn-dark">Search</button>
        {q && <Link href="/owner/bills" className="btn btn-ghost">Clear</Link>}
      </form>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Serial No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Vehicle</th>
              <th className="num">Total</th>
              <th>Status</th>
              <th>Share</th>
              <th>Due reminder</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id}>
                <td>
                  <b className="mono" style={{ color: "var(--ink)", letterSpacing: "0.02em" }}>
                    {b.number}
                  </b>
                </td>
                <td>{fmtDate(b.createdAt)}</td>
                <td>{b.user.name}</td>
                <td><span className="reg">{prettyReg(b.vehicle.regNo)}</span></td>
                <td className="num mono"><b>{money(b.total)}</b></td>
                <td><span className={`badge ${b.paid ? "paid" : "unpaid"}`}>{b.paid ? "Paid" : "Due"}</span></td>
                <td><ShareBill bill={b} user={b.user} vehicle={b.vehicle} /></td>
                <td>
                  {!b.paid
                    ? <ShareBill bill={b} user={b.user} vehicle={b.vehicle} reminder={true} />
                    : <span className="muted small">—</span>}
                </td>
                <td className="right"><Link href={`/owner/bills/${b.id}`} className="btn btn-ghost btn-sm">Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {bills.length === 0 && (
          <div className="empty">
            {q ? `No bills found matching “${q}”.` : "No bills in the database yet."}
          </div>
        )}
      </div>
    </>
  );
}
