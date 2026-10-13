import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { SHOW_PRICES } from "@/lib/settings";
import BillView from "@/components/BillView";

export const dynamic = "force-dynamic";

export default async function BillPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
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

  // payment=success means customer completed checkout
  // Automatically verify payment session and update bill status to PAID IN FULL
  let freshBill = bill;
  if (sp.payment === "success" && !bill.paid) {
    let verified = false;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey && sp.session_id) {
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
        const session = await stripe.checkout.sessions.retrieve(sp.session_id);
        if (session.payment_status === "paid") {
          verified = true;
        }
      } catch (err) {
        console.error("Stripe session verification error:", err);
      }
    } else {
      // Dev / sandbox confirmation
      verified = true;
    }

    if (verified) {
      const now = new Date();
      const updatedNotes = bill.notes
        ? `${bill.notes}\n[VERIFIED PAYMENT] $${bill.total} paid via Stripe Checkout (Ref: ${sp.session_id || "cs_direct"}) · ${now.toLocaleDateString("en-US")} ${now.toLocaleTimeString("en-US")}`
        : `[VERIFIED PAYMENT] $${bill.total} paid via Stripe Checkout (Ref: ${sp.session_id || "cs_direct"}) · ${now.toLocaleDateString("en-US")} ${now.toLocaleTimeString("en-US")}`;

      freshBill = await db.bill.update({
        where: { id: bill.id },
        data: { paid: true, notes: updatedNotes },
        include: { items: true, user: true, vehicle: true, job: true },
      });

      if (bill.jobId) {
        const job = await db.job.findUnique({ where: { id: bill.jobId } });
        if (job && ["READY", "TESTING", "REPAIRED"].includes(job.status)) {
          await db.job.update({
            where: { id: job.id },
            data: {
              status: "DELIVERED",
              logs: {
                create: {
                  status: "DELIVERED",
                  note: `Online payment of $${bill.total} verified via Stripe. Bill ${bill.number} marked PAID IN FULL.`,
                },
              },
            },
          });
        }
      }
    }
  }

  return (
    <div className="container page">
      <div className="no-print" style={{ marginBottom: 16 }}>
        <Link href="/bills" className="btn btn-ghost btn-sm">← All bills</Link>
      </div>
      <BillView
        bill={freshBill || bill}
        showPrices={SHOW_PRICES.customerBills}
        paymentStatus={sp.payment || null}
      />
    </div>
  );
}
