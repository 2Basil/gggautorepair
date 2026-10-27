"use server";

import { SHOW_PRICES, REQUIRE_VERIFICATION } from "@/lib/settings";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, destroySession, getUser, requireOwner, requireStaff, requireUser, getOnboardingSession, destroyOnboardingSession } from "@/lib/auth";
import crypto from "crypto";
import { sendOtp, checkOtp, isVerified, otpChannel, normalizePhone } from "@/lib/otp";
import { uniqueUserCode, uniqueUsername, validateUsername } from "@/lib/userCode";
import { predict } from "@/lib/pricing";
import { learnFromBill, loadSamples } from "@/lib/learn";
import { normReg, billTotals, money } from "@/lib/format";
import { STATUS_KEYS, VEHICLE_TYPES, FUELS, GARAGE } from "@/lib/config";
import Stripe from "stripe";
import { baseUrl } from "@/lib/baseUrl";

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
  if (REQUIRE_VERIFICATION && !(await isVerified(channel === "email" ? email : phone))) return { error: channel === "email" ? "Please verify your email with the code we send you first." : "Please verify your mobile number with the OTP first." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  const vehicle = readVehicle(f);
  const ve = vehicleError(vehicle);
  if (ve) return { error: ve, step: 2 };

  if (await db.user.findUnique({ where: { email } })) return { error: "An account with this email already exists. Try logging in." };
  if (await db.user.findFirst({ where: { phone } })) return { error: "An account with this phone number already exists. Try logging in." };
  if (await db.vehicle.findUnique({ where: { regNo: vehicle.regNo } })) return { error: "This registration number is already registered.", step: 2 };

  // Auto-generate username; user may have supplied a preferred one in the form
  const rawUsername = s(f.username).toLowerCase().replace(/[^a-z0-9_]/g, "");
  const chosenUsername = rawUsername.length >= 3 ? rawUsername : null;
  let username = chosenUsername
    ? (await db.user.findUnique({ where: { username: chosenUsername }, select: { id: true } }) ? await uniqueUsername(name) : chosenUsername)
    : await uniqueUsername(name);

  const user = await db.user.create({
    data: {
      name,
      email,
      phone,
      phoneVerified: REQUIRE_VERIFICATION && channel === "phone",
      username,
      userCode: await uniqueUserCode(name, phone),
      address: s(f.address) || null,
      city: s(f.city) || null,
      passwordHash: await bcrypt.hash(password, 12),
      vehicles: { create: vehicle },
    },
  });
  await createSession(user);
  redirect("/dashboard");
}

export async function completeGoogleOnboarding(_prev, fd) {
  const session = await getOnboardingSession();
  if (!session || !session.email) {
    return { error: "Your session has expired. Please sign in with Google again." };
  }

  const f = Object.fromEntries(fd);
  const name = s(f.name) || session.name || "Customer";
  const email = session.email.toLowerCase().trim();
  const phone = normalizePhone(f.phone);

  if (!name) return { error: "Please enter your name." };
  if (!phone || phone.length < 8) return { error: "Please enter a valid mobile number." };

  const vehicle = readVehicle(f);
  const ve = vehicleError(vehicle);
  if (ve) return { error: ve, step: 2 };

  // Check if another account exists with this phone
  const phoneExists = await db.user.findFirst({ where: { phone } });
  if (phoneExists && phoneExists.email !== email) {
    return { error: "An account with this mobile number already exists." };
  }

  // Check if regNo already exists
  if (await db.vehicle.findUnique({ where: { regNo: vehicle.regNo } })) {
    return { error: "This vehicle registration number is already registered.", step: 2 };
  }

  // Determine username
  const rawUsername = s(f.username).toLowerCase().replace(/[^a-z0-9_]/g, "");
  const chosenUsername = rawUsername.length >= 3 ? rawUsername : null;
  let username = chosenUsername
    ? (await db.user.findUnique({ where: { username: chosenUsername }, select: { id: true } }) ? await uniqueUsername(name) : chosenUsername)
    : await uniqueUsername(name);

  // Generate secure random password hash for OAuth user
  const randomPass = crypto.randomBytes(24).toString("hex");
  const passwordHash = await bcrypt.hash(randomPass, 10);

  let user = await db.user.findUnique({ where: { email } });
  if (user) {
    await db.vehicle.create({
      data: {
        ...vehicle,
        userId: user.id,
      },
    });
    if (!user.phone || user.phone !== phone) {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          phone,
          phoneVerified: true,
          address: s(f.address) || user.address,
          city: s(f.city) || user.city,
        },
      });
    }
  } else {
    user = await db.user.create({
      data: {
        name,
        email,
        phone,
        phoneVerified: true,
        username,
        userCode: await uniqueUserCode(name, phone),
        address: s(f.address) || null,
        city: s(f.city) || null,
        passwordHash,
        role: "CUSTOMER",
        vehicles: { create: vehicle },
      },
    });
  }

  await destroyOnboardingSession();
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
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return { ok: "Password changed. Use the new password next time you log in." };
}

export async function updateUsername(_prev, fd) {
  const me = await requireUser();
  const desired = s(fd.get("username")).toLowerCase().replace(/\s/g, "_");
  const err = validateUsername(desired);
  if (err) return { error: err };
  const existing = await db.user.findUnique({ where: { username: desired }, select: { id: true } });
  if (existing && existing.id !== me.id) return { error: "That username is already taken. Try another one." };
  await db.user.update({ where: { id: me.id }, data: { username: desired } });
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { ok: `Username updated to @${desired}` };
}

export async function sendPasswordResetOtp(email) {
  const e = s(email).toLowerCase();
  if (!e.includes("@")) return { error: "Enter a valid email address." };
  // Always return success-like response to avoid leaking whether an email is registered
  const user = await db.user.findUnique({ where: { email: e } });
  if (!user) return { ok: true }; // silent — don't leak account existence
  return await sendOtp(e);
}

export async function resetPassword(email, code, password, confirm) {
  const e = s(email).toLowerCase();
  const pw = String(password || "");
  const cf = String(confirm || "");
  if (!e.includes("@")) return { error: "Invalid email." };
  if (pw.length < 8) return { error: "New password must be at least 8 characters." };
  if (pw !== cf) return { error: "Passwords do not match." };
  const verified = await checkOtp(e, code);
  if (verified?.error) return verified;
  const user = await db.user.findUnique({ where: { email: e } });
  if (!user) return { error: "No account found with that email address." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(pw, 12) } });
  return { ok: "Your password has been reset. You can now log in." };
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
    data: { name, empId, email: `${empId}@staff.local`, phone: "-", passwordHash: await bcrypt.hash(password, 12), role: "EMPLOYEE" },
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
  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
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

  const job = await db.job.create({
    data: {
      code: `TMP-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
      userId: user.id,
      vehicleId: vehicle.id,
      query: q.slice(0, 500),
      estMin: 0,
      estMax: 0,
      status: "BOOKED",
      items: { create: [] },
      logs: { create: { status: "BOOKED", note: "Customer requested price estimate from garage owner." } },
    },
  });
  await db.job.update({ where: { id: job.id }, data: { code: `PS-${1000 + job.id}` } });
  revalidatePath("/dashboard");
  revalidatePath("/owner");
  revalidatePath("/owner/jobs");
  return { jobId: job.id };
}

export async function getJobStatus(jobId) {
  const user = await getUser();
  if (!user) return null;
  const job = await db.job.findUnique({
    where: { id: int(jobId) },
    include: {
      items: true,
      logs: { orderBy: { createdAt: "asc" } },
      bills: { select: { id: true, total: true, paid: true } },
    },
  });
  if (!job || (job.userId !== user.id && user.role !== "OWNER")) return null;
  return {
    status: job.status,
    estMin: job.estMin,
    estMax: job.estMax,
    items: job.items.map((i) => ({
      id: i.id,
      description: i.description,
      category: i.category,
      qty: i.qty,
      unitPrice: i.unitPrice,
    })),
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
  const rawNote = s(fd.get("note"));
  const note = rawNote ? rawNote.slice(0, 100) : null;
  await db.job.update({
    where: { id },
    data: { status, logs: { create: { status, note } } },
  });
  revalidatePath(`/owner/jobs/${id}`);
  revalidatePath(`/track/${id}`);
  revalidatePath("/owner");
  revalidatePath("/owner/jobs");
  revalidatePath("/dashboard");
}

export async function ownerBookJob(fd) {
  await requireStaff();
  const id = int(fd.get("jobId"));
  const rawNote = s(fd.get("note"));
  const note = rawNote || "Service booked & confirmed by garage owner. Repair process started.";
  const job = await db.job.findUnique({ where: { id } });
  if (!job) return { error: "Job not found" };
  await db.job.update({
    where: { id },
    data: {
      status: "REPAIRING",
      logs: { create: { status: "REPAIRING", note } },
    },
  });
  revalidatePath("/owner");
  revalidatePath("/owner/jobs");
  revalidatePath(`/owner/jobs/${id}`);
  revalidatePath(`/track/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function ownerDeclineJob(fd) {
  await requireStaff();
  const id = int(fd.get("jobId"));
  const rawReason = s(fd.get("reason"));
  const reason = rawReason || "Estimate / service request declined by garage owner.";
  const job = await db.job.findUnique({ where: { id } });
  if (!job) return { error: "Job not found" };
  await db.job.update({
    where: { id },
    data: {
      status: "CANCELLED",
      logs: { create: { status: "CANCELLED", note: reason } },
    },
  });
  revalidatePath("/owner");
  revalidatePath("/owner/jobs");
  revalidatePath(`/owner/jobs/${id}`);
  revalidatePath(`/track/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function acceptJobRequest(fd) {
  return await ownerBookJob(fd);
}

export async function sendJobEstimate(fd) {
  await requireStaff();
  const jobId = int(fd.get("jobId"));
  const minVal = int(fd.get("estMin"));
  const maxVal = int(fd.get("estMax")) || minVal;
  const estMin = Math.min(minVal, maxVal);
  const estMax = Math.max(minVal, maxVal);
  const note = s(fd.get("note")) || "Estimate provided by garage. Please bring your vehicle in.";

  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  const logNote = `Estimate sent: $${estMin}${estMax !== estMin ? ` – $${estMax}` : ""}. ${note}`;
  await db.job.update({
    where: { id: jobId },
    data: {
      estMin,
      estMax,
      logs: { create: { status: job.status, note: logNote } },
    },
  });

  revalidatePath("/owner");
  revalidatePath("/owner/jobs");
  revalidatePath(`/owner/jobs/${jobId}`);
  revalidatePath(`/track/${jobId}`);
  revalidatePath("/dashboard");
}

export async function customerAcceptEstimate(fd) {
  const user = await requireUser();
  const jobId = int(fd.get("jobId"));
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || (job.userId !== user.id && user.role !== "OWNER")) return { error: "Job not found" };

  await db.jobLog.create({
    data: {
      jobId: job.id,
      status: job.status,
      note: `Customer booked service & accepted estimate of $${job.estMin}${job.estMax !== job.estMin ? ` – $${job.estMax}` : ""}. Ready to bring vehicle to garage.`,
    },
  });

  revalidatePath(`/track/${jobId}`);
  revalidatePath("/dashboard");
  revalidatePath("/owner");
  revalidatePath("/owner/jobs");
  revalidatePath(`/owner/jobs/${jobId}`);
  return { ok: true };
}

export async function customerCancelJob(fd) {
  const user = await requireUser();
  const jobId = int(fd.get("jobId"));
  const reason = s(fd.get("reason")) || "Customer stepped back due to estimated / updated charges.";
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.userId !== user.id) return;
  if (["DELIVERED", "CANCELLED"].includes(job.status)) return;
  await db.job.update({
    where: { id: jobId },
    data: {
      status: "CANCELLED",
      logs: { create: { status: "CANCELLED", note: reason } },
    },
  });
  revalidatePath(`/track/${jobId}`);
  revalidatePath("/dashboard");
}

export async function rescheduleJob(_prev, fd) {
  const user = await requireUser();
  const jobId = int(fd.get("jobId"));
  const newDate = s(fd.get("preferredDate"));
  const newTime = s(fd.get("preferredTime"));
  const note = s(fd.get("note"));
  if (!newDate) return { error: "Please select a preferred date." };
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.userId !== user.id) return { error: "Job not found." };
  if (["DELIVERED", "CANCELLED"].includes(job.status)) return { error: "This job is already closed." };
  const rescheduleNote = `Customer requested reschedule to ${newDate}${newTime ? ` at ${newTime}` : ""}${note ? `. Note: ${note}` : ""}.`;
  await db.job.update({
    where: { id: jobId },
    data: { logs: { create: { status: job.status, note: rescheduleNote } } },
  });
  revalidatePath(`/track/${jobId}`);
  revalidatePath("/dashboard");
  return { ok: `Reschedule request sent for ${newDate}${newTime ? ` at ${newTime}` : ""}. The garage will confirm shortly.` };
}

/* -------------------------------- Stripe payments -------------------------------- */

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-04-30" });
}

export async function createStripeCheckout(billId) {
  const user = await requireUser();
  const bill = await db.bill.findUnique({ where: { id: int(billId) }, include: { items: true, vehicle: true } });
  if (!bill || bill.userId !== user.id) return { error: "Bill not found." };
  if (bill.paid) return { error: "This bill is already paid." };
  const stripe = getStripe();
  if (!stripe) {
    // No STRIPE_SECRET_KEY configured — inform the UI so it falls back to manual proof submission
    return { noStripe: true, message: "Card payments via Stripe are not yet configured by the garage owner." };
  }
  const appUrl = (await baseUrl()).replace(/\/$/, "");

  // Build discounts: if a discount is set, create a one-time coupon for exact amount off
  let discounts = [];
  if (bill.discount > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: Math.round(bill.discount * 100), // discount stored as dollars
      currency: "usd",
      duration: "once",
      name: `Invoice ${bill.number} discount`,
    });
    discounts = [{ coupon: coupon.id }];
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "link"],
    mode: "payment",
    customer_email: user.email,
    metadata: { billId: String(bill.id), userId: String(user.id) },
    line_items: bill.items.map((i) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: i.description,
          description: `${i.category} — ${bill.vehicle.make} ${bill.vehicle.model}`,
        },
        unit_amount: Math.round(i.unitPrice * 100),
      },
      quantity: i.qty,
    })),
    discounts,
    success_url: `${appUrl}/bills/${bill.id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/bills/${bill.id}?payment=cancelled`,
  });
  return { url: session.url };
}

/**
 * Submit payment reference / proof for garage owner verification.
 * Customer provides their transaction ID, sender name, or cash counter note.
 * Does NOT mark the bill as paid; sets it to pending verification for the garage owner to confirm.
 *
 * ZERO-STORAGE PCI ENCLAVE:
 * Absolutely NO card numbers, CVVs, or cardholder credentials are accepted or saved.
 */
export async function submitPaymentProof(billId, paymentDetails = {}) {
  const user = await requireUser();
  const bill = await db.bill.findUnique({
    where: { id: int(billId) },
    include: { items: true, vehicle: true, job: true },
  });
  if (!bill) return { error: "Bill not found." };
  if (bill.userId !== user.id && user.role !== "OWNER") return { error: "Unauthorized access to this bill." };
  if (bill.paid) return { ok: true, alreadyPaid: true, message: "This bill has already been verified and paid." };

  // Zero-Storage Check: ensure no sensitive card data is passed
  if (paymentDetails.cardNumber || paymentDetails.cvc || paymentDetails.cardCvc || paymentDetails.cardExpiry) {
    return { error: "Security violation: raw card credentials cannot be processed directly." };
  }

  const gateway = s(paymentDetails.gateway) || "Online Transfer";
  const method = s(paymentDetails.method) || "Direct Transfer";
  const payerName = s(paymentDetails.payerName) || user.name;
  const txnRef = s(paymentDetails.txnRef) || `REF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const notes = s(paymentDetails.notes);
  const now = new Date();

  // Masked brand/last4 if from Sandbox
  const brand = s(paymentDetails.brand);
  const last4 = s(paymentDetails.last4);
  const cardToken = s(paymentDetails.token);

  const cardMeta = brand && last4 ? ` (${brand} ···· ${last4})` : "";
  const submissionEntry = `[PAYMENT_SUBMITTED] $${bill.total} via ${gateway} (${method}${cardMeta}) · Ref: ${txnRef} · By: ${payerName}${notes ? ` · Note: ${notes}` : ""}${cardToken ? ` · Token: ${cardToken.slice(0, 16)}…` : ""} · Submitted: ${now.toLocaleDateString("en-US")} ${now.toLocaleTimeString("en-US")}`;

  const updatedNotes = bill.notes ? `${bill.notes}\n${submissionEntry}` : submissionEntry;

  await db.bill.update({
    where: { id: bill.id },
    data: { notes: updatedNotes },
  });

  if (bill.jobId) {
    await db.jobLog.create({
      data: {
        jobId: bill.jobId,
        status: bill.job?.status || "BOOKED",
        note: `Payment submission of $${bill.total} received via ${method} (Ref: ${txnRef}). Awaiting garage owner verification.`,
      },
    });
    revalidatePath(`/track/${bill.jobId}`);
  }

  revalidatePath(`/bills/${bill.id}`);
  revalidatePath(`/owner/bills/${bill.id}`);
  revalidatePath("/owner/bills");
  revalidatePath("/bills");
  revalidatePath("/dashboard");

  return {
    ok: true,
    pendingVerification: true,
    txnRef,
    gateway,
    method,
    amount: bill.total,
    submittedAt: now.toISOString(),
  };
}

/**
 * Garage Owner / Staff action to verify customer payment and officially mark bill PAID IN FULL.
 */
export async function verifyAndConfirmPayment(fd) {
  const staff = await requireStaff();
  const billId = typeof fd === "object" && fd?.get ? int(fd.get("billId")) : int(fd);
  const bill = await db.bill.findUnique({
    where: { id: billId },
    include: { job: true },
  });
  if (!bill) return { error: "Bill not found." };
  if (bill.paid) return { ok: true, alreadyPaid: true };

  const now = new Date();
  const verifyEntry = `[VERIFIED PAYMENT] $${bill.total} payment verified and settled by garage staff (${staff.name}) · Verified: ${now.toLocaleDateString("en-US")} ${now.toLocaleTimeString("en-US")}`;
  const updatedNotes = bill.notes ? `${bill.notes}\n${verifyEntry}` : verifyEntry;

  await db.bill.update({
    where: { id: bill.id },
    data: {
      paid: true,
      notes: updatedNotes,
    },
  });

  if (bill.jobId) {
    const job = await db.job.findUnique({ where: { id: bill.jobId } });
    if (job) {
      const advanceToDelivered = ["READY", "TESTING", "REPAIRED"].includes(job.status);
      await db.job.update({
        where: { id: job.id },
        data: {
          status: advanceToDelivered ? "DELIVERED" : job.status,
          logs: {
            create: {
              status: advanceToDelivered ? "DELIVERED" : job.status,
              note: `Payment of $${bill.total} verified and confirmed by ${staff.name}. Bill marked PAID IN FULL.`,
            },
          },
        },
      });
      revalidatePath(`/track/${job.id}`);
    }
  }

  revalidatePath(`/bills/${bill.id}`);
  revalidatePath(`/owner/bills/${bill.id}`);
  revalidatePath("/owner/bills");
  revalidatePath("/bills");
  revalidatePath("/dashboard");

  return { ok: true, paid: true };
}

/**
 * Garage Owner action to flag or reject an unverified payment submission (e.g. invalid ref #).
 */
export async function rejectPaymentSubmission(fd) {
  const staff = await requireStaff();
  const billId = typeof fd === "object" && fd?.get ? int(fd.get("billId")) : int(fd);
  const reason = typeof fd === "object" && fd?.get ? s(fd.get("reason")) : "Payment not found in garage receiving account. Please verify reference and resubmit.";
  const bill = await db.bill.findUnique({ where: { id: billId } });
  if (!bill) return { error: "Bill not found." };

  const now = new Date();
  const flagEntry = `[PAYMENT_FLAGGED] Garage staff (${staff.name}) flagged submission: ${reason} · ${now.toLocaleDateString("en-US")} ${now.toLocaleTimeString("en-US")}`;
  const updatedNotes = bill.notes ? `${bill.notes}\n${flagEntry}` : flagEntry;

  await db.bill.update({
    where: { id: bill.id },
    data: { notes: updatedNotes },
  });

  revalidatePath(`/bills/${bill.id}`);
  revalidatePath(`/owner/bills/${bill.id}`);
  revalidatePath("/owner/bills");
  revalidatePath("/bills");
  revalidatePath("/dashboard");

  return { ok: true, flagged: true };
}

/**
 * Wrapper for automated / verified webhook settlement (e.g. Stripe checkout).
 * Regular customers calling this are safely routed to submitPaymentProof.
 */
export async function verifyAndSettleBill(billId, paymentDetails = {}) {
  const user = await requireUser();
  if (user.role !== "OWNER") {
    // Non-staff customers must submit for owner verification
    return await submitPaymentProof(billId, paymentDetails);
  }
  return await verifyAndConfirmPayment(billId);
}

export async function confirmReschedule(jobId, confirmedDate, note) {
  await requireStaff();
  const id = int(jobId);
  const job = await db.job.findUnique({ where: { id } });
  if (!job) return { error: "Job not found." };
  await db.job.update({
    where: { id },
    data: {
      logs: {
        create: {
          status: job.status,
          note: `Reschedule confirmed for ${confirmedDate} by garage.${note ? ` Note: ${note}` : ""}`,
        },
      },
    },
  });
  revalidatePath(`/owner/jobs/${id}`);
  revalidatePath(`/track/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function closeJobCase(fd) {
  await requireStaff();
  const jobId = int(fd.get("jobId"));
  const note = s(fd.get("note")) || "Case closed by garage";
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return;
  await db.job.update({
    where: { id: jobId },
    data: {
      status: "CANCELLED",
      logs: { create: { status: "CANCELLED", note } },
    },
  });
  revalidatePath(`/owner/jobs/${jobId}`);
  revalidatePath(`/track/${jobId}`);
  revalidatePath("/owner/jobs");
  revalidatePath("/owner");
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
  revalidatePath(`/track/${jobId}`);
}

export async function removeJobItem(fd) {
  await requireStaff();
  const id = int(fd.get("id"));
  const item = await db.jobItem.findUnique({ where: { id } });
  if (!item) return;
  await db.jobItem.delete({ where: { id } });
  revalidatePath(`/owner/jobs/${item.jobId}`);
  revalidatePath(`/track/${item.jobId}`);
}

export async function generateJobBillFromItems(fd) {
  await requireStaff();
  const jobId = int(fd.get("jobId"));
  const discount = Math.max(0, int(fd.get("discount")));
  const taxPct = Math.min(40, Math.max(0, int(fd.get("taxPct"), GARAGE.taxPct)));
  const paid = fd.get("paid") === "on" || fd.get("paid") === "true";
  const notes = s(fd.get("notes")) || null;

  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { items: true, vehicle: true },
  });
  if (!job) return;

  let items = job.items.map((i) => ({
    description: i.description,
    category: i.category,
    qty: i.qty,
    unitPrice: i.unitPrice,
  }));
  if (!items.length) {
    items.push({
      description: job.query || "Garage service",
      category: "Repairing",
      qty: 1,
      unitPrice: job.estMin || 0,
    });
  }

  const t = billTotals(items, discount, taxPct);
  const bill = await db.bill.create({
    data: {
      number: `TMP-${Date.now()}`,
      userId: job.userId,
      vehicleId: job.vehicleId,
      jobId: job.id,
      subtotal: t.subtotal,
      discount: t.discount,
      taxPct,
      tax: t.tax,
      total: t.total,
      paid,
      notes,
      items: { create: items },
    },
  });
  await db.bill.update({ where: { id: bill.id }, data: { number: `INV-${String(bill.id).padStart(4, "0")}` } });
  await learnFromBill(bill.id);

  await db.job.update({
    where: { id: jobId },
    data: {
      status: paid ? "DELIVERED" : "READY",
      logs: { create: { status: paid ? "DELIVERED" : "READY", note: `Final bill ${bill.number} generated: ${money(t.total)} (Discount: ${money(t.discount)})` } },
    },
  });

  revalidatePath(`/owner/jobs/${jobId}`);
  revalidatePath(`/track/${jobId}`);
  revalidatePath("/owner/bills");
  revalidatePath("/bills");
  redirect(`/owner/bills/${bill.id}`);
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

/* ------------------------------ receiving methods & payments ------------------------------ */

export async function saveReceivingMethod(fd) {
  await requireStaff();
  const id = s(fd.get("id"));
  const type = s(fd.get("type")) || "CARD";
  const title = s(fd.get("title"));
  const badge = s(fd.get("badge"));
  const details = s(fd.get("details"));
  const accountName = s(fd.get("accountName"));
  const instructions = s(fd.get("instructions"));
  const active = fd.get("active") === "on" || fd.get("active") === "true" || fd.get("active") === "1";

  const { savePaymentMethod } = await import("@/lib/paymentMethods");
  await savePaymentMethod({
    id,
    type,
    title,
    badge,
    details,
    accountName,
    instructions,
    active,
  });

  revalidatePath("/owner/payments");
  revalidatePath("/bills");
}

export async function toggleReceivingMethodActive(fd) {
  await requireStaff();
  const id = s(fd.get("id"));
  const active = fd.get("active") === "true" || fd.get("active") === "1";
  const { togglePaymentMethodActive } = await import("@/lib/paymentMethods");
  await togglePaymentMethodActive(id, active);
  revalidatePath("/owner/payments");
  revalidatePath("/bills");
}

export async function deleteReceivingMethod(fd) {
  await requireStaff();
  const id = s(fd.get("id"));
  const { deletePaymentMethod } = await import("@/lib/paymentMethods");
  await deletePaymentMethod(id);
  revalidatePath("/owner/payments");
  revalidatePath("/bills");
}

export async function getOwnerPendingEstimates() {
  const user = await getUser();
  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE")) return [];
  const jobs = await db.job.findMany({
    where: { status: "BOOKED" },
    orderBy: { createdAt: "desc" },
    include: {
      vehicle: true,
      user: true,
      logs: { orderBy: { createdAt: "desc" } },
    },
  });
  return jobs.map((j) => {
    const ownerQuoted = j.logs?.some((l) => l.note?.startsWith("Estimate sent:"));
    const customerAccepted = j.logs?.some((l) => l.note?.toLowerCase().includes("customer accepted") || l.note?.toLowerCase().includes("booked service"));
    const estimateLog = j.logs?.find((l) => l.note?.startsWith("Estimate sent:"));
    const ownerNote = estimateLog?.note ? estimateLog.note.replace(/^Estimate sent:\s*\$[^.]*\.\s*/i, "") : "";
    return {
      id: j.id,
      code: j.code,
      query: j.query,
      estMin: ownerQuoted ? j.estMin : 0,
      estMax: ownerQuoted ? j.estMax : 0,
      ownerQuoted: !!ownerQuoted,
      ownerNote,
      customerAccepted: !!customerAccepted,
      status: j.status,
      createdAt: j.createdAt.toISOString(),
      vehicle: {
        make: j.vehicle?.make || "Vehicle",
        model: j.vehicle?.model || "",
        regNo: j.vehicle?.regNo || "",
        year: j.vehicle?.year || "",
      },
      user: {
        name: j.user?.name || "Customer",
        phone: j.user?.phone || "",
        email: j.user?.email || "",
      },
    };
  });
}



