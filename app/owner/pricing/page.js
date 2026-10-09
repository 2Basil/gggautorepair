import Link from "next/link";
import { db } from "@/lib/db";
import { CATEGORIES, VEHICLE_TYPES } from "@/lib/config";
import { savePrices, fillPrices, createService } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Pricing({ searchParams }) {
  const sp = await searchParams;
  const type = VEHICLE_TYPES[sp.type] ? sp.type : "HATCHBACK";
  const [services, prices, counts] = await Promise.all([
    db.service.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    db.servicePrice.findMany({ where: { vehicleType: type } }),
    db.servicePrice.groupBy({ by: ["vehicleType"], _count: { _all: true } }),
  ]);
  const price = Object.fromEntries(prices.map((p) => [p.serviceId, p.price]));
  const count = Object.fromEntries(counts.map((c) => [c.vehicleType, c._count._all]));

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal · 1</span>
          <h1>Services &amp; prices</h1>
          <div className="muted">Pick a vehicle type, then set your price for each service. Customers see these prices on the home page for their own vehicle type. Leave a price blank to hide that service for this vehicle type.</div>
        </div>
      </div>

      <div className="tabs" style={{ flexWrap: "wrap" }}>
        {Object.entries(VEHICLE_TYPES).map(([k, v]) => (
          <Link key={k} href={`/owner/pricing?type=${k}`} className={type === k ? "on" : ""}>{v.label} <span className="tiny">({count[k] || 0})</span></Link>
        ))}
      </div>

      {sp.saved && <div className="alert ok">Prices saved for {VEHICLE_TYPES[type].label}. They are live on the customers’ home page.</div>}
      {sp.filled && <div className="alert ok">Empty rows were filled from the base price. Edit any of them and save.</div>}

      <form action={savePrices}>
        <input type="hidden" name="type" value={type} />
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Category</th><th>Service</th><th className="num">Price for {VEHICLE_TYPES[type].label} ($)</th></tr></thead>
            <tbody>
              {CATEGORIES.flatMap((cat) => services.filter((s) => s.category === cat)).map((s) => (
                <tr key={s.id}>
                  <td className="muted">{s.category}</td>
                  <td><b>{s.name}</b><div className="muted small">{s.description}</div></td>
                  <td className="num"><input name={`p_${s.id}`} type="number" min="0" defaultValue={price[s.id] ?? ""} placeholder="not offered" style={{ maxWidth: 130, textAlign: "right" }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary">Save {VEHICLE_TYPES[type].label} prices</button>
          <button className="btn btn-ghost" formAction={fillPrices}>Fill empty rows from base price</button>
        </div>
      </form>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Add a new service</h3>
        <form action={createService} className="form-grid">
          <div className="field"><label>Name</label><input name="name" required /></div>
          <div className="field"><label>Category</label><select name="category">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label>Base price $ (hatchback)</label><input name="basePrice" type="number" min="0" required /></div>
          <div className="field"><label>Keywords (for the AI)</label><input name="keywords" placeholder="brake, squeal" /></div>
          <div className="field full"><label>Description</label><input name="description" /></div>
          <div className="full"><button className="btn btn-dark">Add service</button> <Link href="/owner/catalog" className="btn-link small" style={{ marginLeft: 10 }}>Edit names &amp; keywords →</Link></div>
        </form>
      </div>
    </>
  );
}
