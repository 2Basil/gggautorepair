import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ShareBill from "@/components/ShareBill";
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
      {/* Top action bar */}
      <div className="row between no-print" style={{ marginBottom: 8 }}>
        <Link href="/owner/bills" className="btn btn-ghost btn-sm">← All bills</Link>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <span className="muted small" style={{ alignSelf: "center" }}>Visible to {bill.user.name} in "My bills".</span>
          <ShareBill bill={bill} user={bill.user} vehicle={bill.vehicle} />
          <form action={toggleBillPaid}>
            <input type="hidden" name="id" value={bill.id} />
            <button className={`btn btn-sm ${bill.paid ? "btn-ghost" : "btn-primary"}`}>
              {bill.paid ? "Mark as unpaid" : "Mark as paid"}
            </button>
          </form>
        </div>
      </div>

      {/* Due reminder — only when unpaid */}
      {!bill.paid && (
        <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <ShareBill bill={bill} user={bill.user} vehicle={bill.vehicle} reminder={true} />
        </div>
      )}

      <BillView bill={bill} />
    </>
  );
}
