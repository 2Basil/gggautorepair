"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, destroySession, getUser, requireOwner, requireUser } from "@/lib/auth";
import { estimateFor } from "@/lib/estimate";
import { normReg, billTotals } from "@/lib/format";
import { STATUS_KEYS, VEHICLE_TYPES, FUELS, GARAGE } from "@/lib/config";

const s = (v) => String(v ?? "").trim();
const int = (v, d = 0) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : d;
};

function readVehicle(f) {
  const regNo = normReg(f.regNo);
  const type = VEHICLE_TYPES[f.type] ? f.type : "HATCHBACK";
  const fuel = FUELS.includes(f.fuel) ? f.fuel : "PETROL";
  return {
    regNo,
    make: s(f.make),
    model: s(f.model),
    year: int(f.year, new Date().getFullYear()),
    type,
    fuel,
    color: s(f.color) || null,
    odometer: Math.max(0, int(f.odometer)),
  };
}

function vehicleError(v) {
  if (!v.regNo || v.regNo.length < 6) return "Please enter a valid registration number (e.g. DL3CAB1234).";
  if (!v.make || !v.model) return "Vehicle make and model are required.";
  if (v.year < 1980 || v.year > new Date().getFullYear() + 1) return "Please enter a valid manufacturing year.";
  return null;
}

/* ---------------------------------- auth ---------------------------------- */

export async function registerCustomer(_prev, fd) {
  const f = Object.fromEntries(fd);
  const name = s(f.name);
  const email = s(f.email).toLowerCase();
  const phone = s(f.phone);
  const password = String(f.password || "");
  if (!name || !email.includes("@") || phone.length < 8) return { error: "Please fill in your name, a valid email and phone number." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  const vehicle = readVehicle(f);
  const ve = vehicleError(vehicle);
  if (ve) return { error: ve, step: 2 };

  if (await db.user.findUnique({ where: { email } })) return { error: "An account with this email already exists. Try logging in." };
  if (await db.vehicle.findUnique({ where: { regNo: vehicle.regNo } })) return { error: "This registration number is already registered.", step: 2 };

  const user = await db.user.create({
    data: {
      name,
      email,
      phone,
      address: s(f.address) || null,
      city: s(f.city) || null,
      passwordHash: await bcrypt.hash(password, 10),
      vehicles: { create: vehicle },
    },
  });
  await createSession(user);
  redirect("/dashboard");
}

export async function login(_prev, fd) {
  const email = s(fd.get("email")).toLowerCase();
  const password = String(fd.get("password") || "");
  const next = s(fd.get("next"));
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Incorrect email or password." };
  await createSession(user);
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  redirect(user.role === "OWNER" ? "/owner" : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function joinAsOwner(_prev, fd) {
  const code = s(fd.get("code"));
  if (!process.env.OWNER_ACCESS_CODE || code !== process.env.OWNER_ACCESS_CODE) return { error: "Invalid access code." };
  const name = s(fd.get("name"));
  const email = s(fd.get("email")).toLowerCase();
  const password = String(fd.get("password") || "");
  if (!name || !email.includes("@") || password.length < 6) return { error: "Enter your name, a valid email and a password of 6+ characters." };
  const existing = await db.user.findUnique({ where: { email } });
  let user;
  if (existing) {
    if (!(await bcrypt.compare(password, existing.passwordHash))) return { error: "That email already has an account — use its password to upgrade it." };
    user = await db.user.update({ where: { id: existing.id }, data: { role: "OWNER" } });
  } else {
    user = await db.user.create({
      data: { name, email, phone: s(fd.get("phone")) || "-", passwordHash: await bcrypt.hash(password, 10), role: "OWNER" },
    });
  }
  await createSession(user);
  redirect("/owner");
}

/* --------------------------------- vehicles -------------------------------- */

export async function addVehicle(_prev, fd) {
  const user = await requireUser("/vehicles/new");
  const vehicle = readVehicle(Object.fromEntries(fd));
  const ve = vehicleError(vehicle);
  if (ve) return { error: ve };
  if (await db.vehicle.findUnique({ where: { regNo: vehicle.regNo } })) return { error: "This registration number is already registered." };
  await db.vehicle.create({ data: { ...vehicle, userId: user.id } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateOdometer(fd) {
  const user = await requireUser();
  const id = int(fd.get("vehicleId"));
  const v = await db.vehicle.findUnique({ where: { id } });
  if (!v || (v.userId !== user.id && user.role !== "OWNER")) return;
  await db.vehicle.update({ where: { id }, data: { odometer: Math.max(0, int(fd.get("odometer"))) } });
  revalidatePath(`/vehicles/${id}`);
}

/* ---------------------------- estimate & booking --------------------------- */

export async function estimateQuery(vehicleId, query) {
  const user = await requireUser("/book");
  const vehicle = await db.vehicle.findUnique({ where: { id: int(vehicleId) } });
  if (!vehicle || vehicle.userId !== user.id) return { error: "Choose one of your vehicles." };
  if (s(query).length < 3) return { error: "Tell us a little more about what you need." };
  const services = await db.service.findMany({ where: { active: true } });
  return { estimate: estimateFor(query, services, vehicle.type) };
}

export async function bookJob(vehicleId, query) {
  const user = await requireUser("/book");
  const vehicle = await db.vehicle.findUnique({ where: { id: int(vehicleId) } });
  if (!vehicle || vehicle.userId !== user.id) return { error: "Choose one of your vehicles." };
  const q = s(query);
  if (q.length < 3) return { error: "Tell us a little more about what you need." };
  const services = await db.service.findMany({ where: { active: true } });
  const est = estimateFor(q, services, vehicle.type);

  const job = await db.job.create({
    data: {
      code: `TMP-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
      userId: user.id,
      vehicleId: vehicle.id,
      query: q.slice(0, 500),
      estMin: est.min,
      estMax: est.max,
      status: "BOOKED",
      items: { create: est.items.map((i) => ({ description: i.name, category: i.category, qty: 1, unitPrice: i.mid })) },
      logs: { create: { status: "BOOKED", note: "Request received" } },
    },
  });
  await db.job.update({ where: { id: job.id }, data: { code: `PS-${1000 + job.id}` } });
  revalidatePath("/dashboard");
  return { jobId: job.id };
}

export async function getJobStatus(jobId) {
  const user = await getUser();
  if (!user) return null;
  const job = await db.job.findUnique({
    where: { id: int(jobId) },
    include: { logs: { orderBy: { createdAt: "asc" } }, bills: { select: { id: true, total: true, paid: true } } },
  });
  if (!job || (job.userId !== user.id && user.role !== "OWNER")) return null;
  return {
    status: job.status,
    logs: job.logs.map((l) => ({ status: l.status, note: l.note, at: l.createdAt.toISOString() })),
    bill: job.bills[0] || null,
  };
}

/* ------------------------------ subscriptions ------------------------------ */

export async function subscribePlan(fd) {
  const user = await requireUser("/plans");
  const plan = await db.plan.findUnique({ where: { id: int(fd.get("planId")) } });
  const vehicle = await db.vehicle.findUnique({ where: { id: int(fd.get("vehicleId")) } });
  if (!plan || !vehicle || vehicle.userId !== user.id) redirect("/plans?error=1");
  const endsAt = new Date();
  if (plan.period === "YEARLY") endsAt.setFullYear(endsAt.getFullYear() + 1);
  else endsAt.setMonth(endsAt.getMonth() + 1);
  await db.subscription.create({ data: { userId: user.id, vehicleId: vehicle.id, planId: plan.id, endsAt } });
  revalidatePath("/dashboard");
  redirect("/dashboard?subscribed=1");
}

export async function cancelSubscription(fd) {
  const user = await requireUser();
  const id = int(fd.get("id"));
  const sub = await db.subscription.findUnique({ where: { id } });
  if (!sub || sub.userId !== user.id) return;
  await db.subscription.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/dashboard");
}

/* ---------------------------------- owner ---------------------------------- */

export async function updateJobStatus(fd) {
  await requireOwner();
  const id = int(fd.get("jobId"));
  const status = s(fd.get("status"));
  if (!STATUS_KEYS.includes(status)) return;
  await db.job.update({
    where: { id },
    data: { status, logs: { create: { status, note: s(fd.get("note")) || null } } },
  });
  revalidatePath(`/owner/jobs/${id}`);
  revalidatePath(`/track/${id}`);
}

export async function addJobItem(fd) {
  await requireOwner();
  const jobId = int(fd.get("jobId"));
  const description = s(fd.get("description"));
  const unitPrice = int(fd.get("unitPrice"));
  if (!description || unitPrice < 0) return;
  await db.jobItem.create({
    data: { jobId, description, category: s(fd.get("category")) || "Repairing", qty: Math.max(1, int(fd.get("qty"), 1)), unitPrice },
  });
  revalidatePath(`/owner/jobs/${jobId}`);
}

export async function removeJobItem(fd) {
  await requireOwner();
  const id = int(fd.get("id"));
  const item = await db.jobItem.findUnique({ where: { id } });
  if (!item) return;
  await db.jobItem.delete({ where: { id } });
  revalidatePath(`/owner/jobs/${item.jobId}`);
}

export async function createBill(payload) {
  const owner = await requireOwner();
  const userId = int(payload.userId);
  const vehicleId = int(payload.vehicleId);
  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle || vehicle.userId !== userId) return { error: "Pick a customer and one of their vehicles." };
  const items = (payload.items || [])
    .map((i) => ({
      description: s(i.description),
      category: s(i.category) || "Repairing",
      qty: Math.max(1, int(i.qty, 1)),
      unitPrice: Math.max(0, int(i.unitPrice)),
    }))
    .filter((i) => i.description);
  if (!items.length) return { error: "Add at least one line item." };
  const taxPct = Math.min(40, Math.max(0, int(payload.taxPct, GARAGE.taxPct)));
  const t = billTotals(items, int(payload.discount), taxPct);
  const jobId = payload.jobId ? int(payload.jobId) : null;

  const bill = await db.bill.create({
    data: {
      number: `TMP-${Date.now()}`,
      userId,
      vehicleId,
      jobId,
      subtotal: t.subtotal,
      discount: t.discount,
      taxPct,
      tax: t.tax,
      total: t.total,
      paid: !!payload.paid,
      notes: s(payload.notes) || null,
      items: { create: items },
    },
  });
  await db.bill.update({ where: { id: bill.id }, data: { number: `INV-${String(bill.id).padStart(4, "0")}` } });
  if (jobId) {
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (job && ["BOOKED", "REPAIRING", "REPAIRED", "TESTING"].includes(job.status)) {
      await db.job.update({ where: { id: jobId }, data: { status: "READY", logs: { create: { status: "READY", note: "Final bill generated" } } } });
    }
    revalidatePath(`/track/${jobId}`);
  }
  revalidatePath("/bills");
  revalidatePath("/owner/bills");
  void owner;
  return { id: bill.id };
}

export async function toggleBillPaid(fd) {
  await requireOwner();
  const id = int(fd.get("id"));
  const bill = await db.bill.findUnique({ where: { id } });
  if (!bill) return;
  await db.bill.update({ where: { id }, data: { paid: !bill.paid } });
  revalidatePath(`/owner/bills/${id}`);
  revalidatePath(`/bills/${id}`);
  revalidatePath("/owner/bills");
}

export async function updateService(fd) {
  await requireOwner();
  const id = int(fd.get("id"));
  await db.service.update({
    where: { id },
    data: {
      name: s(fd.get("name")),
      basePrice: Math.max(0, int(fd.get("basePrice"))),
      keywords: s(fd.get("keywords")),
      active: fd.get("active") === "on",
    },
  });
  revalidatePath("/owner/catalog");
  revalidatePath("/");
}

export async function createService(fd) {
  await requireOwner();
  const name = s(fd.get("name"));
  if (!name) return;
  await db.service.create({
    data: {
      name,
      category: s(fd.get("category")) || "Repairing",
      description: s(fd.get("description")) || name,
      basePrice: Math.max(0, int(fd.get("basePrice"))),
      keywords: s(fd.get("keywords")) || name.toLowerCase(),
    },
  });
  revalidatePath("/owner/catalog");
  revalidatePath("/");
}

export async function grantOwner(fd) {
  await requireOwner();
  const email = s(fd.get("email")).toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) redirect("/owner/access?error=notfound");
  await db.user.update({ where: { id: user.id }, data: { role: "OWNER" } });
  revalidatePath("/owner/access");
  redirect("/owner/access?ok=1");
}

export async function revokeOwner(fd) {
  const me = await requireOwner();
  const id = int(fd.get("id"));
  if (id === me.id) redirect("/owner/access?error=self");
  await db.user.update({ where: { id }, data: { role: "CUSTOMER" } });
  revalidatePath("/owner/access");
}
