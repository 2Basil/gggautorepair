import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { SHOW_PRICES } from "@/lib/settings";
import BillView from "@/components/BillView";

export const dynamic = "force-dynamic";

export default async function BillPage({ params }) {
  const { id } = await params;
  const user = await requireUser(`/bills/${id}`);

  // Lookup by ID or by unique Serial Number
  const bill = await db.bill.findFirst({
    where: isNaN(Number(id))
      ? { number: String(id) }
      : { OR: [{ id: Number(id) }, { number: String(id) }] },
    include: { items: true, user: true, vehicle: true, job: true },
  });

  // STRICT PRIVACY: Show ONLY to garage owner or to the respective customer who owns this bill
  if (!bill || (bill.userId !== user.id && user.role !== "OWNER")) {
    notFound();
  }

  return (
    <div className="container page">
      <div className="no-print" style={{ marginBottom: 16 }}>
        <Link href="/bills" className="btn btn-ghost btn-sm">← All bills</Link>
      </div>
      <BillView bill={bill} showPrices={SHOW_PRICES.customerBills} />
    </div>
  );
}
