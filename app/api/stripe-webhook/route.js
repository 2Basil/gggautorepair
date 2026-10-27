import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30" })
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
      // PRODUCTION: verify the Stripe signature — prevents forged webhook events
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // DEV ONLY fallback: parse without signature verification.
      // Set STRIPE_WEBHOOK_SECRET in .env to enable signature checking.
      console.warn("[stripe-webhook] No STRIPE_WEBHOOK_SECRET set — skipping signature verification (dev mode only).");
      event = JSON.parse(body);
    }
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const billId = Number(session.metadata?.billId);
    if (billId) {
      await db.bill.update({
        where: { id: billId },
        data: { paid: true },
      });

      // If there's a linked job in READY state, mark it DELIVERED
      const bill = await db.bill.findUnique({ where: { id: billId }, select: { jobId: true } });
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

      revalidatePath(`/bills/${billId}`);
      revalidatePath(`/owner/bills/${billId}`);
      revalidatePath("/owner/bills");
      revalidatePath("/bills");
      revalidatePath("/dashboard");
    }
  }

  return NextResponse.json({ received: true });
}
