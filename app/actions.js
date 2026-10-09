"use server";

import { SHOW_PRICES } from "@/lib/settings";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, destroySession, getUser, requireOwner, requireStaff, requireUser } from "@/lib/auth";
import { sendOtp, checkOtp, isVerified, otpChannel, normalizePhone } from "@/lib/otp";
import { uniqueUserCode } from "@/lib/userCode";
import { predict } from "@/lib/pricing";
import { learnFromBill, loadSamples } from "@/lib/learn";
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

export async function sendPhoneOtp(contact) {
  return await sendOtp(contact);
}

export async function verifyPhoneOtp(contact, code) {
  return await checkOtp(contact, code);
}

export async function registerCustomer(_prev, fd) {
  const f = Object.fromEntries(fd);
  const name = s(f.name);
  const email = s(f.email).toLowerCase();
  const phone = normalizePhone(f.phone);
  const password = String(f.password || "");
  if (!name || !email.includes("@") || phone.length < 9) return { error: "Please fill in your name, a valid email and phone number." };
  const channel = otpChannel();
  if (!(await isVerified(channel === "email" ? email : phone))) return { error: channel === "email" ? "Please verify your email with the code we send you first." : "Please verify your mobile number with the OTP first." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  const vehicle = readVehicle(f);
  const ve = vehicleError(vehicle);
  if (ve) return { error: ve, step: 2 };

  if (await db.user.findUnique({ where: { email } })) return { error: "An account with this email already exists. Try logging in." };
  if (await db.user.findFirst({ where: { phone } })) return { error: "An account with this phone number already exists. Try logging in." };
  if (await db.vehicle.findUnique({ where: { regNo: vehicle.regNo } })) return { error: "This registration number is already registered.", step: 2 };

  const user = await db.user.create({
    data: {
      name,
      email,
      phone,
      phoneVerified: channel === "phone",
      userCode: await uniqueUserCode(name, phone),
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
  const id = s(fd.get("email")).toLowerCase();
  const password = String(fd.get("password") || "");
  const next = s(fd.get("next"));
  // owners and customers log in with their email, employees with their employee ID
  const user = id.includes("@") ? await db.user.findUnique({ where: { email: id } }) : await db.user.findUnique({ where: { empId: id } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Incorrect ID/email or password." };
  await createSession(user);
  const staff = user.role === "OWNER" || user.role === "EMPLOYEE";
  if (next.startsWith("/") && !next.startsWith("//") && (staff || !next.startsWith("/owner"))) redirect(next);
  redirect(staff ? "/owner" : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function joinAsOwner() {
  // Owner accounts are no longer self-service: the owner logs in with the owner email and can grant access from the portal.
  return { error: "Owner sign-up is closed. The owner logs in with the owner email on the normal login page." };
}

export async function changePassword(_prev, fd) {
  const me = await requireStaff();
  const cur = String(fd.get("current") || "");
  const next = String(fd.get("next") || "");
  const again = String(fd.get("again") || "");
  const user = await db.user.findUnique({ where: { id: me.id } });
  if (!user || !(await bcrypt.compare(cur, user.passwordHash))) return { error: "Your current password is not correct." };
  if (next.length < 8) return { error: "The new password must be at least 8 characters." };
  if (next !== again) return { error: "The new passwords do not match." };
  if (next === cur) return { error: "Choose a password different from the current one." };
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return { ok: "Password changed. Use the new password next time you log in." };
}

/* ------------------------------- employees ------------------------------- */

export async function addEmployee(_prev, fd) {
  await requireOwner();
  const name = s(fd.get("name"));
  const empId = s(fd.get("empId")).toLowerCase();
  const password = String(fd.get("password") || "");
  if (!name) return { error: "Enter the employee's name." };
  if (!/^[a-z0-9._-]{3,24}$/.test(empId)) return { error: "Employee ID must be 3-24 characters: letters, numbers, dot, dash or underscore (no spaces, no @)." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (await db.user.findUnique({ where: { empId } })) return { error: "That Employee ID is already taken." };
  await db.user.create({
    data: { name, empId, email: `${empId}@staff.local`, phone: "-", passwordHash: await bcrypt.hash(password, 10), role: "EMPLOYEE" },
  });
  revalidatePath("/owner/employees");
  return { ok: `Added ${name}. They log in at /login with ID "${empId}" and the password you set.` };
}

export async function resetEmployeePassword(fd) {
  await requireOwner();
  const id = int(fd.get("id"));
  const password = String(fd.get("password") || "");
  const emp = await db.user.findUnique({ where: { id } });
  if (!emp || emp.role !== "EMPLOYEE" || password.length < 6) redirect("/owner/employees?error=password");
  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  redirect("/owner/employees?reset=1");
}

export async function removeEmployee(fd) {
  await requireOwner();
  const id = int(fd.get("id"));
  const emp = await db.user.findUnique({ where: { id } });
  if (emp && emp.role === "EMPLOYEE") await db.user.delete({ where: { id } });
  revalidatePath("/owner/employees");
}

export async function savePrices(fd) {
  await requireOwner();
  const type = s(fd.get("type"));
  if (!VEHICLE_TYPES[type]) return;
  const services = await db.service.findMany({ select: { id: true } });
  for (const { id } of services) {
    const raw = s(fd.get(`p_${id}`));
    if (raw === "") {
      await db.servicePrice.deleteMany({ where: { serviceId: id, vehicleType: type } });
    } else {
      const price = Math.max(0, int(raw));
      await db.servicePrice.upsert({
        where: { serviceId_vehicleType: { serviceId: id, vehicleType: type } },
        update: { price, updatedAt: new Date() },
        create: { serviceId: id, vehicleType: type, price },
      });
    }
  }
  revalidatePath("/");
  redirect(`/owner/pricing?type=${type}&saved=1`);
}

export async function fillPrices(fd) {
  await requireOwner();
  const type = s(fd.get("type"));
  if (!VEHICLE_TYPES[type]) return;
  const [services, have] = await Promise.all([db.service.findMany(), db.servicePrice.findMany({ where: { vehicleType: type } })]);
  const haveIds = new Set(have.map((h) => h.serviceId));
  for (const sv of services) {
    if (haveIds.has(sv.id)) continue;
    await db.servicePrice.create({ data: { serviceId: sv.id, vehicleType: type, price: Math.max(1, Math.round(sv.basePrice * VEHICLE_TYPES[type].multiplier)) } });
  }
  revalidatePath("/");
  redirect(`/owner/pricing?type=${type}&filled=1`);
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
  const [services, samples] = await Promise.all([db.service.findMany({ where: { active: true } }), loadSamples()]);
  const est = predict(s(query), vehicle, services, samples);
  if (!SHOW_PRICES.estimate) {
    // keep prices on the server; the client only sees which services we matched
    return { estimate: { ...est, min: null, max: null, items: est.items.map(({ min, max, mid, ...rest }) => rest) } };
  }
  return { estimate: est };
}

export async function bookJob(vehicleId, query) {
  const user = await requireUser("/book");
  const vehicle = await db.vehicle.findUnique({ where: { id: int(vehicleId) } });
  if (!vehicle || vehicle.userId !== user.id) return { error: "Choose one of your vehicles." };
  const q = s(query);
  if (q.length < 3) return { error: "Tell us a little more about what you need." };
  const [services, samples] = await Promise.all([db.service.findMany({ where: { active: true } }), loadSamples()]);
  const est = predict(q, vehicle, services, samples);

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
  await requireStaff();
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
  await requireStaff();
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
  await requireStaff();
  const id = int(fd.get("id"));
  const item = await db.jobItem.findUnique({ where: { id } });
  if (!item) return;
  await db.jobItem.delete({ where: { id } });
  revalidatePath(`/owner/jobs/${item.jobId}`);
}

export async function createBill(payload) {
  const owner = await requireStaff();
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
  await learnFromBill(bill.id); // the estimator learns from every final bill
  if (jobId) {
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (job && ["BOOKED", "REPAIRING", "REPAIRED", "TESTING"].includes(job.status)) {
      await db.job.update({ where: { id: jobId }, data: { status: "READY", logs: { create: { status: "READY", note: "Final bill generated" } } } });
    }
    revalidatePath(`/track/${jobId}`);
  }
  revalidatePath("/bills");
  revalidatePath("/owner/bills");
  revalidatePath("/owner/ai");
  void owner;
  return { id: bill.id };
}

export async function toggleBillPaid(fd) {
  await requireStaff();
  const id = int(fd.get("id"));
  const bill = await db.bill.findUnique({ where: { id } });
  if (!bill) return;
  await db.bill.update({ where: { id }, data: { paid: !bill.paid } });
  if (!bill.paid && bill.jobId) {
    const job = await db.job.findUnique({ where: { id: bill.jobId } });
    if (job && job.status === "READY") {
      await db.job.update({ where: { id: job.id }, data: { status: "DELIVERED", logs: { create: { status: "DELIVERED", note: "Payment received" } } } });
      revalidatePath(`/track/${job.id}`);
    }
  }
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

/* ------------------------------ AI price learning ------------------------------ */

export async function backfillSamples() {
  await requireOwner();
  const bills = await db.bill.findMany({ where: { samples: { none: {} } }, select: { id: true } });
  let n = 0;
  for (const b of bills) n += await learnFromBill(b.id);
  revalidatePath("/owner/ai");
  redirect(`/owner/ai?learned=${n}`);
}

export async function toggleSample(fd) {
  await requireOwner();
  const id = int(fd.get("id"));
  const row = await db.priceSample.findUnique({ where: { id } });
  if (!row) return;
  await db.priceSample.update({ where: { id }, data: { active: !row.active } });
  revalidatePath("/owner/ai");
}

export async function deleteSample(fd) {
  await requireOwner();
  await db.priceSample.delete({ where: { id: int(fd.get("id")) } }).catch(() => {});
  revalidatePath("/owner/ai");
}
