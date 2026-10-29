import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public liveness check: reveals nothing about configuration.
export async function GET() {
  try {
    await db.service.count();
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[health]", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
