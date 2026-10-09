import { VEHICLE_TYPES } from "./config";

// Turns ?type=&q=&from=&to= into a Prisma filter over bill line items.
export function ledgerWhere(sp) {
  const type = VEHICLE_TYPES[sp.type] ? sp.type : "";
  const q = String(sp.q || "").trim();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from || "") ? sp.from : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.to || "") ? sp.to : "";
  const bill = {};
  if (type) bill.vehicle = { type };
  if (from || to) bill.createdAt = { ...(from && { gte: new Date(from + "T00:00:00") }), ...(to && { lte: new Date(to + "T23:59:59") }) };
  const where = {};
  if (Object.keys(bill).length) where.bill = bill;
  if (q) where.OR = [{ description: { contains: q } }, { bill: { number: { contains: q.toUpperCase() } } }, { bill: { user: { name: { contains: q } } } }];
  return { where, type, q, from, to };
}
