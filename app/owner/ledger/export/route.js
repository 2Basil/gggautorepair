import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { VEHICLE_TYPES } from "@/lib/config";
import { ledgerWhere } from "@/lib/ledger";

export const dynamic = "force-dynamic";

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET(req) {
  const user = await getUser();
  if (!user || user.role !== "OWNER") return new Response("Forbidden", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const { where } = ledgerWhere(sp);
  const rows = await db.billItem.findMany({
    where,
    include: { bill: { include: { vehicle: { select: { type: true } }, user: { select: { name: true } } } } },
    orderBy: { bill: { createdAt: "desc" } },
  });
  const lines = [["Date", "Bill", "Customer", "Vehicle type", "Service", "Qty", "Charge"].join(",")];
  for (const r of rows) {
    lines.push([r.bill.createdAt.toISOString().slice(0, 10), r.bill.number, r.bill.user.name, VEHICLE_TYPES[r.bill.vehicle.type]?.label || r.bill.vehicle.type, r.description, r.qty, r.qty * r.unitPrice].map(esc).join(","));
  }
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="ledger.csv"' } });
}
