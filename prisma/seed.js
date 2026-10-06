// Run with: npm run seed        (set SEED_DEMO=0 to skip the demo customers/jobs/bills)
require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const bcrypt = require("bcryptjs");

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

const db =
  tursoUrl && (tursoUrl.startsWith("libsql://") || tursoUrl.startsWith("https://"))
    ? new PrismaClient({
        adapter: new PrismaLibSql({
          url: tursoUrl,
          authToken: tursoAuthToken,
        }),
      })
    : new PrismaClient();

const SERVICES = [
  // Repairing
  ["Inspection & Diagnostics", "Repairing", "Computer scan and 21-point check to find the root cause.", 600, "check,inspect,inspection,diagnose,diagnostic,problem,issue,fault,scan,warning light,check engine"],
  ["Brake Pad Replacement", "Repairing", "Front/rear pad replacement with disc check and brake fluid top-up.", 1800, "brake,brakes,braking,squeal,squeak,stopping,pad,pads,pedal soft,brake noise"],
  ["Engine Repair & Tuning", "Repairing", "Misfire, rough idle, stalling, smoke and power-loss fixes.", 3500, "engine,misfire,stall,stalling,smoke,rough idle,pickup,power loss,knocking,jerk,jerking"],
  ["Clutch Repair", "Repairing", "Clutch plate, pressure plate and release bearing replacement.", 4500, "clutch,gear slip,gear hard,gear stuck,hard to shift,clutch pedal,slipping"],
  ["AC Service & Gas Refill", "Repairing", "Full AC check, gas top-up, filter clean and cooling test.", 1800, "ac,a c,air conditioner,air conditioning,cooling,not cooling,hot air,ac smell,gas refill"],
  ["Battery Replacement", "Repairing", "Test and replace battery, clean terminals, check alternator.", 4200, "battery,dead,not starting,wont start,won't start,jump start,starting problem,self"],
  ["Suspension Repair", "Repairing", "Shock absorbers, bushes, links and mounts replaced.", 3200, "suspension,shock,shocker,bumpy,bump,rattle,thud,noise on bumps,ride quality"],
  ["Wheel Alignment & Balancing", "Repairing", "Computerised 3D alignment and wheel balancing.", 900, "alignment,balancing,balance,vibration,steering pull,pulling,wobble,steering shake,shaking"],
  ["Tyre Replacement", "Repairing", "New tyres fitted, balanced and aligned. Price per set of four.", 5200, "tyre,tire,tyres,puncture,flat,tread,bald,blowout,tubeless"],
  ["Radiator & Cooling System", "Repairing", "Coolant flush, radiator repair, hose and thermostat checks.", 1400, "overheat,overheating,coolant,radiator,temperature,steam,leak coolant"],
  ["Electrical & Lighting Repair", "Repairing", "Wiring, fuses, headlights, wipers, power windows and central locking.", 1200, "electrical,wiring,fuse,headlight,wiper,power window,central lock,horn,indicator,light not working"],
  // Washing
  ["Exterior Foam Wash", "Washing", "Pressure rinse, foam wash, tyre dressing and wipe-dry.", 300, "wash,washing,car wash,exterior wash,foam wash,cleaning,clean outside,dirty"],
  ["Wash + Interior Vacuum", "Washing", "Foam wash with full interior vacuum and dashboard polish.", 600, "interior,vacuum,interior clean,dashboard,seats,wash and vacuum,full wash,wash vacuum"],
  ["Deep Interior Detailing", "Washing", "Seat shampoo, roof liner, carpet and AC vent sanitising.", 2500, "detailing,deep clean,deep cleaning,shampoo,stain,smell,odour,sanitise,upholstery"],
  ["Underbody Wash & Anti-Rust", "Washing", "High-pressure underbody wash with anti-rust coating.", 900, "underbody,anti rust,rust,under body,chassis wash,rust coating"],
  // Modification
  ["Alloy Wheels (set of 4)", "Modification", "Fitment of new alloy wheels with balancing.", 12000, "alloy,alloys,wheels,rims,rim,mag wheels,modify wheels"],
  ["Music System Upgrade", "Modification", "Head unit, speakers and amplifier installation.", 8000, "music,music system,speaker,speakers,stereo,audio,sound system,head unit,subwoofer,android"],
  ["LED Headlights & Lighting", "Modification", "LED/projector headlights, fog lamps and ambient lighting.", 3500, "led,projector,headlight upgrade,fog lamp,ambient,lighting upgrade,drl"],
  ["Body Wrap / Vinyl", "Modification", "Full or partial vinyl wrap in matte, gloss or satin finishes.", 25000, "wrap,vinyl,color change,colour change,matte,ppf,sticker,decal,graphics"],
  ["Spoiler & Body Kit", "Modification", "Fitment of spoilers, lip kits and side skirts.", 4000, "spoiler,body kit,bodykit,lip,side skirt,bumper kit,exterior mod,modify,modification,customise,customize"],
  ["Ceramic Coating", "Modification", "9H ceramic coating with paint correction.", 12000, "ceramic,ceramic coating,coating,paint protection,shine,polish,teflon"],
  // Maintenance
  ["Full Periodic Service", "Maintenance", "Oil, oil filter, air filter, plugs check, brake & fluids check.", 4500, "service,full service,periodic,periodic service,regular service,maintenance,scheduled,general service"],
  ["Engine Oil Change", "Maintenance", "Synthetic/semi-synthetic oil with new oil filter.", 1500, "oil,oil change,engine oil,oil leak,lubricant,oil filter"],
  ["Dent & Paint Work", "Maintenance", "Dent removal, scratch repair and panel painting.", 3500, "dent,dents,scratch,scratches,paint,painting,bumper,panel,accident,denting"],
];

const PLANS = [
  ["SHINE", "Shine", "MONTHLY", 699, false, ["2 foam washes every month", "Interior vacuum with each wash", "Tyre pressure & fluid top-up", "5% off on parts"]],
  ["SHINE", "Shine", "YEARLY", 6990, false, ["2 foam washes every month", "Interior vacuum with each wash", "Tyre pressure & fluid top-up", "5% off on parts", "2 months free"]],
  ["CARE", "Care", "MONTHLY", 1499, true, ["Everything in Shine", "Monthly 21-point inspection", "Free pickup & drop", "10% off on labour", "Priority booking"]],
  ["CARE", "Care", "YEARLY", 14990, true, ["Everything in Shine", "Monthly 21-point inspection", "Free pickup & drop", "10% off on labour", "Priority booking", "2 months free"]],
  ["ELITE", "Elite", "MONTHLY", 2999, false, ["Everything in Care", "Monthly deep interior detailing", "Ceramic top-up wash", "Battery & AC health checks", "15% off on labour", "Roadside assistance", "Dedicated service advisor"]],
  ["ELITE", "Elite", "YEARLY", 29990, false, ["Everything in Care", "Monthly deep interior detailing", "Ceramic top-up wash", "Battery & AC health checks", "15% off on labour", "Roadside assistance", "Dedicated service advisor", "2 months free"]],
];

const daysAgo = (n, h = 11) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, 0, 0, 0);
  return d;
};

async function main() {
  // ---- catalogue (idempotent) ----
  if ((await db.service.count()) === 0) {
    await db.service.createMany({
      data: SERVICES.map(([name, category, description, basePrice, keywords]) => ({ name, category, description, basePrice, keywords })),
    });
  }
  for (const [tier, name, period, price, popular, perks] of PLANS) {
    await db.plan.upsert({
      where: { tier_period: { tier, period } },
      update: { name, price, popular, perks: perks.join("\n") },
      create: { tier, name, period, price, popular, perks: perks.join("\n") },
    });
  }

  // ---- owner account ----
  const ownerEmail = (process.env.OWNER_EMAIL || "owner@pitstop.local").toLowerCase();
  const ownerPass = process.env.OWNER_PASSWORD || "owner123";
  await db.user.upsert({
    where: { email: ownerEmail },
    update: { role: "OWNER" },
    create: { name: "Garage Owner", email: ownerEmail, phone: "9000000000", city: "Your City", passwordHash: await bcrypt.hash(ownerPass, 10), role: "OWNER" },
  });
  console.log(`Owner login: ${ownerEmail} / ${ownerPass}`);

  // ---- demo data ----
  if (process.env.SEED_DEMO === "0" || (await db.user.count({ where: { role: "CUSTOMER" } })) > 0) {
    console.log("Skipping demo data.");
    return;
  }
  const hash = await bcrypt.hash("demo123", 10);
  const svc = Object.fromEntries((await db.service.findMany()).map((s) => [s.name, s]));

  const people = [
    { name: "Aarav Sharma", email: "aarav@example.com", phone: "9811111111", city: "Delhi", vehicles: [
      { regNo: "DL3CAB1234", make: "Maruti Suzuki", model: "Swift", year: 2019, type: "HATCHBACK", fuel: "PETROL", color: "White", odometer: 42100 },
      { regNo: "DL8CAF9087", make: "Hyundai", model: "Creta", year: 2021, type: "SUV", fuel: "DIESEL", color: "Grey", odometer: 28800 } ] },
    { name: "Priya Nair", email: "priya@example.com", phone: "9822222222", city: "Noida", vehicles: [
      { regNo: "UP16BT4521", make: "Honda", model: "City", year: 2020, type: "SEDAN", fuel: "PETROL", color: "Silver", odometer: 35600 } ] },
    { name: "Rohan Verma", email: "rohan@example.com", phone: "9833333333", city: "Gurugram", vehicles: [
      { regNo: "HR26DK7788", make: "BMW", model: "3 Series", year: 2018, type: "LUXURY", fuel: "DIESEL", color: "Black", odometer: 61000 } ] },
  ];

  const users = [];
  for (const p of people) {
    const u = await db.user.create({
      data: { name: p.name, email: p.email, phone: p.phone, city: p.city, passwordHash: hash, vehicles: { create: p.vehicles } },
      include: { vehicles: true },
    });
    users.push(u);
  }

  const mult = { HATCHBACK: 1, SEDAN: 1.15, SUV: 1.35, LUXURY: 1.8 };
  const jobsSpec = [
    // [userIdx, vehIdx, query, [service names], status, daysAgo]
    [0, 0, "Brake noise when stopping and car needs a full wash", ["Brake Pad Replacement", "Exterior Foam Wash"], "DELIVERED", 150],
    [1, 0, "Regular service due", ["Full Periodic Service"], "DELIVERED", 120],
    [2, 0, "AC not cooling properly", ["AC Service & Gas Refill"], "DELIVERED", 95],
    [0, 1, "Alloy wheels and music system upgrade", ["Alloy Wheels (set of 4)", "Music System Upgrade"], "DELIVERED", 70],
    [1, 0, "Deep interior cleaning, smell in cabin", ["Deep Interior Detailing"], "DELIVERED", 45],
    [2, 0, "Suspension rattle on bumps", ["Suspension Repair", "Wheel Alignment & Balancing"], "DELIVERED", 28],
    [0, 0, "Battery dead, car not starting", ["Battery Replacement"], "DELIVERED", 12],
    [0, 1, "Engine light on and jerking while driving", ["Engine Repair & Tuning", "Inspection & Diagnostics"], "REPAIRING", 2],
    [1, 0, "Clutch pedal very hard, gears slipping", ["Clutch Repair"], "TESTING", 3],
    [2, 0, "Ceramic coating and wash", ["Ceramic Coating", "Wash + Interior Vacuum"], "BOOKED", 0],
  ];

  let billNo = 1000;
  for (const [ui, vi, query, names, status, ago] of jobsSpec) {
    const u = users[ui];
    const v = u.vehicles[vi];
    const m = mult[v.type];
    const items = names.map((n) => {
      const s = svc[n];
      return { description: s.name, category: s.category, qty: 1, unitPrice: Math.round((s.basePrice * m * 1.05) / 10) * 10 };
    });
    const min = items.reduce((a, i) => a + Math.round(i.unitPrice * 0.86), 0);
    const max = items.reduce((a, i) => a + Math.round(i.unitPrice * 1.19), 0);
    const created = daysAgo(ago);
    const order = ["BOOKED", "REPAIRING", "REPAIRED", "TESTING", "READY", "DELIVERED"];
    const upto = order.indexOf(status);
    const job = await db.job.create({
      data: {
        code: `TMP-${Date.now()}-${billNo++}`,
        userId: u.id, vehicleId: v.id, query, estMin: min, estMax: max, status, createdAt: created,
        items: { create: items },
        logs: { create: order.slice(0, upto + 1).map((st, i) => ({ status: st, createdAt: new Date(created.getTime() + i * 3600e3 * 5) })) },
      },
    });
    await db.job.update({ where: { id: job.id }, data: { code: `PS-${1000 + job.id}` } });
    if (status === "DELIVERED") {
      const subtotal = items.reduce((a, i) => a + i.unitPrice, 0);
      const tax = Math.round(subtotal * 0.18);
      await db.bill.create({
        data: {
          number: `INV-${job.id.toString().padStart(4, "0")}`,
          userId: u.id, vehicleId: v.id, jobId: job.id, subtotal, discount: 0, taxPct: 18, tax, total: subtotal + tax,
          paid: ago > 20, createdAt: new Date(created.getTime() + 36e5 * 28),
          items: { create: items },
        },
      });
    }
  }

  // a couple of subscriptions
  const care = await db.plan.findUnique({ where: { tier_period: { tier: "CARE", period: "YEARLY" } } });
  const shine = await db.plan.findUnique({ where: { tier_period: { tier: "SHINE", period: "MONTHLY" } } });
  const ends = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x; };
  await db.subscription.create({ data: { userId: users[0].id, vehicleId: users[0].vehicles[1].id, planId: care.id, endsAt: ends(300) } });
  await db.subscription.create({ data: { userId: users[1].id, vehicleId: users[1].vehicles[0].id, planId: shine.id, endsAt: ends(18) } });

  console.log("Demo data created. Demo customer login: aarav@example.com / demo123");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
