import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const envCheck = {
    hasTursoUrl: Boolean(process.env.TURSO_DATABASE_URL),
    tursoUrlPrefix: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.slice(0, 15) : null,
    hasTursoToken: Boolean(process.env.TURSO_AUTH_TOKEN),
    hasSessionSecret: Boolean(process.env.SESSION_SECRET),
    hasStripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
    nodeEnv: process.env.NODE_ENV,
  };

  try {
    const servicesCount = await db.service.count();
    return NextResponse.json({ status: "ok", servicesCount, envCheck });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        errorName: err.name,
        errorMessage: err.message,
        envCheck,
      },
      { status: 500 }
    );
  }
}
