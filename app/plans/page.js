import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import PlansView from "./PlansView";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await getUser();
  const [plans, vehicles] = await Promise.all([
    db.plan.findMany({ orderBy: { price: "asc" } }),
    user ? db.vehicle.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }) : [],
  ]);
  return (
    <div className="container page">
      <div className="center" style={{ maxWidth: 640, margin: "0 auto 28px" }}>
        <span className="eyebrow">Care plans</span>
        <h1 style={{ fontSize: "2.4rem" }}>Pay once, relax all year.</h1>
        <p className="muted">Choose a monthly or yearly plan for each of your vehicles. Yearly plans give you two months free.</p>
      </div>
      <PlansView
        loggedIn={!!user}
        plans={plans.map((p) => ({ id: p.id, tier: p.tier, name: p.name, period: p.period, price: p.price, popular: p.popular, perks: p.perks.split("\n") }))}
        vehicles={vehicles.map((v) => ({ id: v.id, label: `${v.make} ${v.model} · ${v.regNo}` }))}
      />
    </div>
  );
}
