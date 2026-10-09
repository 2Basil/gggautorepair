import { db } from "@/lib/db";
import { GARAGE } from "@/lib/config";
import BillForm from "./BillForm";
import { predict } from "@/lib/pricing";
import { loadSamples } from "@/lib/learn";

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

  const allPrices = await db.servicePrice.findMany();
  const priceOf = (serviceId, type) => allPrices.find((p) => p.serviceId === serviceId && p.vehicleType === type)?.price;

  let prefill = { userId: Number(sp.userId) || 0, vehicleId: Number(sp.vehicleId) || 0, jobId: 0, items: [] };
  if (sp.jobId) {
    const job = await db.job.findUnique({ where: { id: Number(sp.jobId) || 0 }, include: { items: true, vehicle: true } });
    if (job) {
      let items = job.items.map((i) => ({ description: i.description, category: i.category, qty: i.qty, unitPrice: i.unitPrice }));
      if (!items.length) {
        // estimated bill: match the customer's words to services, priced with the owner's price for this vehicle type
        const est = predict(job.query, job.vehicle, services, await loadSamples());
        items = est.items.map((i) => ({
          description: i.name,
          category: i.category,
          qty: 1,
          unitPrice: priceOf(i.serviceId, job.vehicle.type) ?? i.mid,
        }));
      }
      prefill = { userId: job.userId, vehicleId: job.vehicleId, jobId: job.id, items };
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
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, vehicles: c.vehicles.map((v) => ({ id: v.id, type: v.type, label: `${v.make} ${v.model} · ${v.regNo}` })) }))}
        services={services.map((s) => ({ id: s.id, name: s.name, category: s.category, price: s.basePrice, prices: Object.fromEntries(allPrices.filter((p) => p.serviceId === s.id).map((p) => [p.vehicleType, p.price])) }))}
        prefill={prefill}
        defaultTax={GARAGE.taxPct}
      />
    </>
  );
}
