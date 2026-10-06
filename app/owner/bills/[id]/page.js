import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import BillView from "@/components/BillView";
import { toggleBillPaid } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function OwnerBill({ params }) {
  const { id } = await params;
  const bill = await db.bill.findUnique({
    where: { id: Number(id) || 0 },
    include: { items: true, user: true, vehicle: true, job: true },
  });
  if (!bill) notFound();
  return (
    <>
      <div className="row between no-print" style={{ marginBottom: 16 }}>
        <Link href="/owner/bills" className="btn btn-ghost btn-sm">← All bills</Link>
        <div className="row">
          <span className="muted small">Visible to {bill.user.name} in “My bills”.</span>
          <form action={toggleBillPaid}>
            <input type="hidden" name="id" value={bill.id} />
            <button className={`btn btn-sm ${bill.paid ? "btn-ghost" : "btn-primary"}`}>{bill.paid ? "Mark as unpaid" : "Mark as paid"}</button>
          </form>
        </div>
      </div>
      <BillView bill={bill} />
    </>
  );
}
