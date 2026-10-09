import { db } from "./db";

/** Turn one bill into training samples (one per line item). Never throws: a missing table must not block billing. */
export async function learnFromBill(billId) {
  try {
    const bill = await db.bill.findUnique({
      where: { id: billId },
      include: { items: true, vehicle: true, job: { select: { query: true } } },
    });
    if (!bill) return 0;
    if ((await db.priceSample.count({ where: { billId } })) > 0) return 0; // already learned
    const v = bill.vehicle;
    const rows = bill.items
      .filter((i) => i.unitPrice > 0 && i.description.trim())
      .map((i) => ({
        billId,
        jobId: bill.jobId,
        description: i.description.trim(),
        category: i.category,
        make: v.make.trim(),
        model: v.model.trim(),
        vehicleType: v.type,
        year: v.year,
        fuel: v.fuel,
        queryText: bill.job?.query || "",
        unitPrice: i.unitPrice,
        qty: i.qty,
        createdAt: bill.createdAt,
      }));
    if (rows.length) await db.priceSample.createMany({ data: rows });
    return rows.length;
  } catch (e) {
    console.error("learnFromBill failed (is the PriceSample table created? run: node prisma/add-price-sample.js)", e?.message || e);
    return 0;
  }
}

/** Active samples for the estimator. Returns [] if the table does not exist yet. */
export async function loadSamples() {
  try {
    return await db.priceSample.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { description: true, category: true, make: true, model: true, vehicleType: true, year: true, queryText: true, unitPrice: true, createdAt: true },
    });
  } catch {
    return [];
  }
}
