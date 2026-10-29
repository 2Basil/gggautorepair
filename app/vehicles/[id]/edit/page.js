import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { VEHICLE_TYPES, FUELS } from "@/lib/config";
import { updateVehicle, deleteVehicle } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function EditVehicle({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/vehicles/${id}/edit`);
  const v = await db.vehicle.findUnique({ where: { id: Number(id) || 0 } });
  if (!v || v.userId !== user.id) notFound();
  const year = new Date().getFullYear();

  return (
    <div className="container page">
      <div className="auth-wrap" style={{ maxWidth: 680 }}>
        <span className="eyebrow">Edit vehicle</span>
        <h1 style={{ fontSize: "2rem" }}>{v.make} {v.model}</h1>
        {sp?.error && <div className="alert err">{sp.error}</div>}
        <form action={updateVehicle} className="card">
          <input type="hidden" name="vehicleId" value={v.id} />
          <div className="form-grid">
            <div className="field full"><label htmlFor="regNo">Registration number *</label><input id="regNo" name="regNo" defaultValue={v.regNo} required style={{ textTransform: "uppercase" }} /></div>
            <div className="field"><label htmlFor="make">Make *</label><input id="make" name="make" defaultValue={v.make} required /></div>
            <div className="field"><label htmlFor="model">Model *</label><input id="model" name="model" defaultValue={v.model} required /></div>
            <div className="field"><label htmlFor="year">Year *</label><input id="year" name="year" type="number" min="1980" max={year + 1} defaultValue={v.year} required /></div>
            <div className="field"><label htmlFor="type">Body type</label>
              <select id="type" name="type" defaultValue={v.type}>{Object.entries(VEHICLE_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select></div>
            <div className="field"><label htmlFor="fuel">Fuel</label>
              <select id="fuel" name="fuel" defaultValue={v.fuel}>{FUELS.map((f) => <option key={f} value={f}>{f[0] + f.slice(1).toLowerCase()}</option>)}</select></div>
            <div className="field"><label htmlFor="color">Colour</label><input id="color" name="color" defaultValue={v.color || ""} /></div>
            <div className="field full"><label htmlFor="odometer">Odometer (km)</label><input id="odometer" name="odometer" type="number" min="0" defaultValue={v.odometer} /></div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-primary">Save changes</button>
            <Link href={`/vehicles/${v.id}`} className="btn btn-ghost">Cancel</Link>
          </div>
        </form>
        <form action={deleteVehicle} className="card" style={{ marginTop: 16 }}>
          <input type="hidden" name="vehicleId" value={v.id} />
          <h3>Remove this vehicle</h3>
          <p className="muted small">This also removes its service and bill history. It can't be undone, and isn't possible while a service is open or a bill is unpaid.</p>
          <button className="btn btn-ghost btn-sm" style={{ color: "#b91c1c" }}>Remove vehicle</button>
        </form>
      </div>
    </div>
  );
}
