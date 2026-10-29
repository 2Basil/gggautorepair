import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { notifyUser } from "@/lib/mail";

export const runtime = "nodejs";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {})
  : null;

export async function POST(req) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  const body = await req.text();

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else if (process.env.NODE_ENV !== "production") {
      // Local dev only: allow unsigned events.
      event = JSON.parse(body);
    } else {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const billId = Number(session.metadata?.billId);
    const existing = billId
      ? await db.bill.findUnique({ where: { id: billId }, select: { id: true, userId: true, paid: true, total: true, jobId: true } })
      : null;
    const amountOk =
      existing && typeof session.amount_total === "number"
        ? Math.abs(session.amount_total - Math.round(existing.total * 100)) <= 1
        : false;
    if (existing && !existing.paid && session.payment_status === "paid" && amountOk) {
      await db.bill.update({
        where: { id: billId },
        data: { paid: true },
      });

      // If there's a linked job in READY state, mark it DELIVERED
      const bill = existing;
      if (bill?.jobId) {
        const job = await db.job.findUnique({ where: { id: bill.jobId } });
        if (job && job.status === "READY") {
          await db.job.update({
            where: { id: job.id },
            data: {
              status: "DELIVERED",
              logs: { create: { status: "DELIVERED", note: "Payment received online via Stripe. Bill settled automatically." } },
            },
          });
          revalidatePath(`/track/${job.id}`);
        }
      }

      await notifyUser(existing.userId, "Payment received", ["Thank you! We received your online payment."]);
      revalidatePath(`/bills/${billId}`);
      revalidatePath(`/owner/bills/${billId}`);
      revalidatePath("/owner/bills");
      revalidatePath("/bills");
      revalidatePath("/dashboard");
    }
  }

  return NextResponse.json({ received: true });
}
