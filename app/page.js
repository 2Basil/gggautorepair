import Link from "next/link";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { CATEGORIES, CATEGORY_BLURB, GARAGE, VEHICLE_TYPES } from "@/lib/config";
import { money } from "@/lib/format";
import { SHOW_PRICES } from "@/lib/settings";
import HomeServices from "@/components/HomeServices";
import CarAssembly from "@/components/CarAssembly";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

const CAT_QUERY = { Repairing: "brake noise and engine check", Washing: "full wash and interior cleaning", Modification: "alloy wheels and music system", Maintenance: "periodic service due" };
const CAT_ICON = { Repairing: "wrench", Washing: "droplet", Modification: "sparkles", Maintenance: "settings" };

export default async function Home() {
  const [services, prices, plans, user] = await Promise.all([
    db.service.findMany({ where: { active: true }, orderBy: { id: "asc" } }),
    db.servicePrice.findMany(),
    db.plan.findMany({ where: { period: "MONTHLY" }, orderBy: { price: "asc" } }),
    getUser(),
  ]);
  const myVehicles = user ? await db.vehicle.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }) : [];
  const mine = [...new Set(myVehicles.map((v) => v.type))];
  const vehicleByType = {};
  for (const v of myVehicles) if (!vehicleByType[v.type]) vehicleByType[v.type] = v.id;
  // data[vehicleType][category] = services the owner has priced for that vehicle type
  const byId = Object.fromEntries(services.map((s) => [s.id, s]));
  const data = {};
  for (const p of prices) {
    const s = byId[p.serviceId];
    if (!s || !VEHICLE_TYPES[p.vehicleType]) continue;
    ((data[p.vehicleType] ||= {})[s.category] ||= []).push({ id: s.id, name: s.name, price: p.price });
  }

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow"><Icon name="shield" size={14} /> Trusted local garage</span>
            <h1>
              We take it apart. <br />
              We build it <em>back better.</em>
            </h1>
            <p className="lead">
              Repairs, washing, modifications and yearly care plans — with an instant price estimate and live tracking of your car,
              just like your favourite delivery app.
            </p>
            <div className="hero-cta">
              <Link href={user ? "/book" : "/register"} className="btn btn-primary">
                {user ? "Get an estimate" : "Register your vehicle"} <Icon name="arrow" size={18} />
              </Link>
              <Link href="/plans" className="btn btn-ghost">See care plans</Link>
            </div>
            <div className="stats">
              <div><b>Live</b><span className="muted small">status tracking</span></div>
              <div><b>$0</b><span className="muted small">hidden charges</span></div>
              <div><b>1-tap</b><span className="muted small">digital bills</span></div>
            </div>
          </div>
          <div className="car-wrap">
            <CarAssembly />
          </div>
        </div>
      </section>

      <section className="block" id="services">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">What we do</span>
            <h2>Everything your car needs, under one roof.</h2>
            <p className="muted">{SHOW_PRICES.home ? "Starting prices shown for a hatchback. " : ""}Pick a service, or choose “Others” and describe it in your own words.</p>
          </div>
          <HomeServices
            types={Object.entries(VEHICLE_TYPES).map(([key, v]) => ({ key, label: v.label }))}
            categories={CATEGORIES}
            blurbs={CATEGORY_BLURB}
            data={data}
            mine={mine}
            vehicleByType={vehicleByType}
            showPrices={SHOW_PRICES.home}
          />
        </div>
      </section>

      <section className="block">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">How it works</span>
            <h2>From “something’s wrong” to “all fixed” — in plain sight.</h2>
          </div>
          <div className="steps">
            <div className="step"><h3>Register</h3><p className="muted small">Create your account and add your vehicle(s). Add as many as you own.</p></div>
            <div className="step"><h3>Describe the problem</h3><p className="muted small">Write it in your own words — “brake noise”, “AC not cooling”.</p></div>
            <div className="step"><h3>Get an estimate</h3><p className="muted small">See a price range for your exact vehicle type before you commit.</p></div>
            <div className="step"><h3>Track &amp; pay</h3><p className="muted small">Watch Repairing → Repaired → Tested live, then get your digital bill.</p></div>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Care plans</span>
            <h2>Monthly or yearly — never worry about upkeep.</h2>
          </div>
          <div className="grid grid-3">
            {plans.map((p) => (
              <div key={p.id} className={`card plan ${p.popular ? "popular" : ""}`}>
                {p.popular && <span className="tag">MOST POPULAR</span>}
                <h3>{p.name}</h3>
                {SHOW_PRICES.plans && <div className="price">{money(p.price)}<small> / month</small></div>}
                <ul>
                  {p.perks.split("\n").slice(0, 4).map((x) => (
                    <li key={x}><Icon name="check" size={16} stroke={2.4} /> {x}</li>
                  ))}
                </ul>
                <Link href="/plans" className="btn btn-ghost">View plan</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        <div className="cta-band">
          <div>
            <h2>Ready when you are.</h2>
            <p>Questions? Call {GARAGE.phone} or just book online.</p>
          </div>
          <Link href={user ? "/book" : "/register"} className="btn btn-primary">
            {user ? "Book a service" : "Create free account"} <Icon name="arrow" size={18} />
          </Link>
        </div>
      </div>
    </>
  );
}
