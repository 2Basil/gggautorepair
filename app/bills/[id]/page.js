import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import BillView from "@/components/BillView";

export const dynamic = "force-dynamic";

export default async function BillPage({ params }) {
  const { id } = await params;
  const user = await requireUser(`/bills/${id}`);
  const bill = await db.bill.findUnique({
    where: { id: Number(id) || 0 },
    include: { items: true, user: true, vehicle: true, job: true },
  });
  if (!bill || (bill.userId !== user.id && user.role !== "OWNER")) notFound();
  return (
    <div className="container page">
      <div className="no-print" style={{ marginBottom: 16 }}>
        <Link href="/bills" className="btn btn-ghost btn-sm">← All bills</Link>
      </div>
      <BillView bill={bill} />
    </div>
  );
}
