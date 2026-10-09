"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { estimateQuery, bookJob } from "@/app/actions";
import { money } from "@/lib/format";
import { VEHICLE_TYPES } from "@/lib/config";
import { SHOW_PRICES } from "@/lib/settings";

const CONF = {
  "price-list": { label: "Based on our price list", cls: "" },
  low: { label: "Learned from few bills", cls: "unpaid" },
  medium: { label: "Learned from similar bills", cls: "BOOKED" },
  high: { label: "High confidence", cls: "paid" },
};

const EXAMPLES = ["Brake noise when stopping", "AC not cooling", "Full wash and interior cleaning", "Periodic service due", "Engine light on, car jerking", "Alloy wheels and music system"];

export default function EstimateForm({ vehicles, initialVehicle, initialQuery, other }) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState(initialVehicle);
  const [query, setQuery] = useState(initialQuery);
  const [est, setEst] = useState(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(e) {
    e?.preventDefault();
    setError("");
    start(async () => {
      const res = await estimateQuery(vehicleId, query);
      if (res.error) { setEst(null); setError(res.error); } else setEst(res.estimate);
    });
  }

  function book() {
    setError("");
    start(async () => {
      const res = await bookJob(vehicleId, query);
      if (res.error) setError(res.error);
      else router.push(`/track/${res.jobId}`);
    });
  }

  return (
    <div className="stack">
      <form onSubmit={run} className="card">
        <div className="field">
          <label htmlFor="vehicle">Vehicle</label>
          <select id="vehicle" value={vehicleId} onChange={(e) => { setVehicleId(Number(e.target.value)); setEst(null); }}>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="q">Describe the problem or the service you want</label>
          <textarea id="q" autoFocus={other} value={query} onChange={(e) => { setQuery(e.target.value); setEst(null); }} placeholder={other ? "Write your own request — tell us what your car needs…" : "e.g. There is a squealing noise when I brake, and I would also like a full wash."} />
        </div>
        <div className="chips">
          {EXAMPLES.map((x) => (
            <button type="button" key={x} className="chip" onClick={() => { setQuery(x); setEst(null); }}>{x}</button>
          ))}
        </div>
        {error && <div className="alert err">{error}</div>}
        <button className="btn btn-dark btn-block" disabled={pending || query.trim().length < 3}>{pending && !est ? "Calculating…" : "Get my estimate"}</button>
      </form>

      {est && (
        <div className="card">
          <div className="row between">
            <span className="eyebrow" style={{ margin: 0 }}>{SHOW_PRICES.estimate ? "AI estimated spend" : "We understood your request"}</span>
            {SHOW_PRICES.estimate && <span className={`badge ${CONF[est.confidence]?.cls}`}>{CONF[est.confidence]?.label}</span>}
          </div>
          <p className="muted small" style={{ margin: "6px 0 0" }}>
            For your {est.vehicle.year} {est.vehicle.make} {est.vehicle.model} ({VEHICLE_TYPES[est.vehicle.type]?.label})
            {SHOW_PRICES.estimate && est.trainedOn > 0 ? ` — learned from ${est.trainedOn} billed jobs at our garage.` : "."}
          </p>
          {!est.matched && (
            <div className="alert ok">We could not match your description to a specific service, so we have suggested an inspection. Our mechanics will diagnose and share an exact quote.</div>
          )}
          {est.items.map((i) => (
            <div className="est-item" key={i.name}>
              <div>
                <b>{i.name}</b>
                <div className="muted small">{i.description}</div>
                {SHOW_PRICES.estimate && <div className="tiny muted">
                  {i.samples > 0
                    ? i.exact > 0
                      ? `Based on ${i.exact} bill${i.exact > 1 ? "s" : ""} for your car model`
                      : `Based on ${i.samples} similar bill${i.samples > 1 ? "s" : ""}`
                    : "Starting price from our price list"}
                </div>}
              </div>
              {SHOW_PRICES.estimate && <div className="nowrap mono">{money(i.min)} – {money(i.max)}</div>}
            </div>
          ))}
          {SHOW_PRICES.estimate ? (
            <>
              <div className="est-total">
                <span className="muted">Total estimate (excl. Tax)</span>
                <b>{money(est.min)} – {money(est.max)}</b>
              </div>
              <p className="muted small" style={{ marginTop: 10 }}>This is an estimate for your vehicle type. The final charge depends on parts and inspection, and you will see the final bill before pick-up.</p>
            </>
          ) : (
            <p className="muted small" style={{ marginTop: 10 }}>Our team will inspect your vehicle and confirm the charges with you. You will see the final bill once the work is tested.</p>
          )}
          <button className="btn btn-primary btn-block" onClick={book} disabled={pending}>{pending ? "Booking…" : "Book this service"}</button>
        </div>
      )}
    </div>
  );
}
