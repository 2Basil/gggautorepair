import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import EstimateForm from "./EstimateForm";

export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser("/book");
  const vehicles = await db.vehicle.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  const initialQuery = typeof sp.q === "string" ? sp.q : "";
  const initialVehicle = Number(sp.vehicle) || vehicles[0]?.id || 0;

  return (
    <div className="container page">
      <div className="auth-wrap" style={{ maxWidth: 760 }}>
        <span className="eyebrow">Book &amp; estimate</span>
        <h1 style={{ fontSize: "2.1rem" }}>What does your car need?</h1>
        <p className="muted">Write it in your own words. We will match it to our services and show an estimated spend for your exact vehicle.</p>
        {vehicles.length === 0 ? (
          <div className="card empty">
            Add a vehicle first. <br />
            <Link href="/vehicles/new" className="btn btn-primary" style={{ marginTop: 14 }}>Add vehicle</Link>
          </div>
        ) : (
          <EstimateForm
            vehicles={vehicles.map((v) => ({ id: v.id, label: `${v.make} ${v.model} · ${v.regNo}` }))}
            initialVehicle={initialVehicle}
            initialQuery={initialQuery}
          />
        )}
      </div>
    </div>
  );
}
