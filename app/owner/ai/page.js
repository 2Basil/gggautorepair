import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { VEHICLE_TYPES } from "@/lib/config";
import { fmtDate, money } from "@/lib/format";
import { backfillSamples, toggleSample, deleteSample } from "@/app/actions";

export const dynamic = "force-dynamic";

const mult = (t) => (VEHICLE_TYPES[t] || VEHICLE_TYPES.HATCHBACK).multiplier;

export default async function AiPricing({ searchParams }) {
  await requireOwner();
  const sp = await searchParams;
  let samples = [], missing = false, unlearned = 0;
  try {
    samples = await db.priceSample.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
    unlearned = await db.bill.count({ where: { samples: { none: {} } } });
  } catch {
    missing = true;
  }
  const services = await db.service.findMany();
  const base = Object.fromEntries(services.map((s) => [s.name.toLowerCase(), s.basePrice]));

  // what has been learned, per service
  const groups = {};
  for (const s of samples.filter((x) => x.active)) {
    const k = s.description.toLowerCase();
    (groups[k] ||= { name: s.description, n: 0, sum: 0, models: new Set() });
    groups[k].n++;
    groups[k].sum += s.unitPrice / mult(s.vehicleType);
    groups[k].models.add(`${s.make} ${s.model}`);
  }
  const learned = Object.entries(groups).map(([k, g]) => ({ ...g, k, avg: Math.round(g.sum / g.n), list: base[k] })).sort((a, b) => b.n - a.n);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>AI pricing</h1>
          <div className="muted">Every bill you generate teaches the estimator. Customers see estimates based on what you really charged for their car model.</div>
        </div>
      </div>

      {missing && (
        <div className="alert err">
          The learning table does not exist in your database yet. Run <code>node prisma/add-price-sample.js</code> once, then refresh this page.
        </div>
      )}
      {sp.learned !== undefined && <div className="alert ok">Learned from {sp.learned} line items on existing bills.</div>}

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="card kpi"><div className="label">Training examples</div><div className="value">{samples.filter((s) => s.active).length}</div><div className="sub">{samples.length - samples.filter((s) => s.active).length} switched off</div></div>
        <div className="card kpi"><div className="label">Services learned</div><div className="value">{learned.length}</div><div className="sub">across {new Set(samples.map((s) => `${s.make} ${s.model}`)).size} car models</div></div>
        <div className="card kpi">
          <div className="label">Bills not yet learned</div><div className="value">{unlearned}</div>
          <form action={backfillSamples} style={{ marginTop: 8 }}>
            <button className="btn btn-dark btn-sm" disabled={missing || unlearned === 0}>Learn from existing bills</button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>What it has learned</h3>
        <p className="muted small">Average real price as a hatchback-equivalent. Other body types are scaled automatically (Sedan ×1.15, SUV ×1.35, Luxury ×1.8) and your exact car models are weighted most.</p>
        <div className="table-scroll">
          <table className="tbl">
            <thead><tr><th>Service</th><th className="num">Bills</th><th className="num">Learned avg</th><th className="num">Price list</th><th>Car models seen</th></tr></thead>
            <tbody>
              {learned.map((g) => (
                <tr key={g.k}>
                  <td><b>{g.name}</b></td>
                  <td className="num">{g.n}</td>
                  <td className="num mono">{money(g.avg)}</td>
                  <td className="num mono muted">{g.list ? money(g.list) : "—"}</td>
                  <td className="small muted">{[...g.models].slice(0, 4).join(", ")}{g.models.size > 4 ? "…" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {learned.length === 0 && <div className="empty">Nothing learned yet. Generate a bill, or press “Learn from existing bills”.</div>}
      </div>

      <div className="card">
        <h3>Training examples</h3>
        <p className="muted small">Switch off a bill line that was a one-off (big discount, goodwill job) so it does not affect future estimates.</p>
        <div className="table-scroll">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Service / item</th><th>Vehicle</th><th className="num">Price</th><th>Customer wrote</th><th /></tr></thead>
            <tbody>
              {samples.slice(0, 150).map((s) => (
                <tr key={s.id} style={{ opacity: s.active ? 1 : 0.45 }}>
                  <td>{fmtDate(s.createdAt)}</td>
                  <td>{s.description}</td>
                  <td>{s.make} {s.model} <span className="muted small">({VEHICLE_TYPES[s.vehicleType]?.label})</span></td>
                  <td className="num mono">{money(s.unitPrice)}</td>
                  <td className="muted small" style={{ maxWidth: 220 }}>{s.queryText || "—"}</td>
                  <td className="right nowrap">
                    <form action={toggleSample} style={{ display: "inline" }}><input type="hidden" name="id" value={s.id} /><button className="btn-link small">{s.active ? "Switch off" : "Switch on"}</button></form>
                    {" · "}
                    <form action={deleteSample} style={{ display: "inline" }}><input type="hidden" name="id" value={s.id} /><button className="btn-link danger small">Delete</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {samples.length === 0 && !missing && <div className="empty">No training examples yet.</div>}
      </div>
    </>
  );
}
