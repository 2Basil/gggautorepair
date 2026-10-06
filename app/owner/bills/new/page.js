import { db } from "@/lib/db";
import { GARAGE } from "@/lib/config";
import BillForm from "./BillForm";

export const dynamic = "force-dynamic";

export default async function NewBill({ searchParams }) {
  const sp = await searchParams;
  const [customers, services] = await Promise.all([
    db.user.findMany({
      where: { vehicles: { some: {} } },
      include: { vehicles: true },
      orderBy: { name: "asc" },
    }),
    db.service.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);

  let prefill = { userId: Number(sp.userId) || 0, vehicleId: Number(sp.vehicleId) || 0, jobId: 0, items: [] };
  if (sp.jobId) {
    const job = await db.job.findUnique({ where: { id: Number(sp.jobId) || 0 }, include: { items: true } });
    if (job) {
      prefill = {
        userId: job.userId,
        vehicleId: job.vehicleId,
        jobId: job.id,
        items: job.items.map((i) => ({ description: i.description, category: i.category, qty: i.qty, unitPrice: i.unitPrice })),
      };
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>Generate bill</h1>
          <div className="muted">The customer sees this bill under “My bills” for the selected vehicle.</div>
        </div>
      </div>
      <BillForm
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, vehicles: c.vehicles.map((v) => ({ id: v.id, label: `${v.make} ${v.model} · ${v.regNo}` })) }))}
        services={services.map((s) => ({ id: s.id, name: s.name, category: s.category, price: s.basePrice }))}
        prefill={prefill}
        defaultTax={GARAGE.taxPct}
      />
    </>
  );
}
