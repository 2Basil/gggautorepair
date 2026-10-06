import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate, inr, prettyReg } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OwnerBills() {
  const bills = await db.bill.findMany({ include: { user: true, vehicle: true }, orderBy: { createdAt: "desc" }, take: 150 });
  const due = bills.filter((b) => !b.paid).reduce((a, b) => a + b.total, 0);
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>Bills</h1>
          <div className="muted">Outstanding: <b>{inr(due)}</b></div>
        </div>
        <Link href="/owner/bills/new" className="btn btn-primary">Generate new bill</Link>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Bill</th><th>Date</th><th>Customer</th><th>Vehicle</th><th className="num">Total</th><th>Status</th><th /></tr></thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id}>
                <td><b>{b.number}</b></td>
                <td>{fmtDate(b.createdAt)}</td>
                <td>{b.user.name}</td>
                <td><span className="reg">{prettyReg(b.vehicle.regNo)}</span></td>
                <td className="num mono"><b>{inr(b.total)}</b></td>
                <td><span className={`badge ${b.paid ? "paid" : "unpaid"}`}>{b.paid ? "Paid" : "Due"}</span></td>
                <td className="right"><Link href={`/owner/bills/${b.id}`} className="btn btn-ghost btn-sm">Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {bills.length === 0 && <div className="empty">No bills yet.</div>}
      </div>
    </>
  );
}
