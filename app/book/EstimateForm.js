"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { estimateQuery, bookJob } from "@/app/actions";
import { inr } from "@/lib/format";

const EXAMPLES = ["Brake noise when stopping", "AC not cooling", "Full wash and interior cleaning", "Periodic service due", "Engine light on, car jerking", "Alloy wheels and music system"];

export default function EstimateForm({ vehicles, initialVehicle, initialQuery }) {
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
          <textarea id="q" value={query} onChange={(e) => { setQuery(e.target.value); setEst(null); }} placeholder="e.g. There is a squealing noise when I brake, and I would also like a full wash." />
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
          <span className="eyebrow">Estimated spend</span>
          {!est.matched && (
            <div className="alert ok">We could not match your description to a specific service, so we have suggested an inspection. Our mechanics will diagnose and share an exact quote.</div>
          )}
          {est.items.map((i) => (
            <div className="est-item" key={i.serviceId}>
              <div>
                <b>{i.name}</b>
                <div className="muted small">{i.description}</div>
              </div>
              <div className="nowrap mono">{inr(i.min)} – {inr(i.max)}</div>
            </div>
          ))}
          <div className="est-total">
            <span className="muted">Total estimate (excl. GST)</span>
            <b>{inr(est.min)} – {inr(est.max)}</b>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>This is an estimate for your vehicle type. The final charge depends on parts and inspection, and you will see the final bill before pick-up.</p>
          <button className="btn btn-primary btn-block" onClick={book} disabled={pending}>{pending ? "Booking…" : "Book this service"}</button>
        </div>
      )}
    </div>
  );
}
