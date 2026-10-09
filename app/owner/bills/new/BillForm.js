"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBill } from "@/app/actions";
import { CATEGORIES } from "@/lib/config";
import { billTotals, money } from "@/lib/format";

export default function BillForm({ customers, services, prefill, defaultTax }) {
  const router = useRouter();
  const [userId, setUserId] = useState(prefill.userId || customers[0]?.id || 0);
  const customer = customers.find((c) => c.id === Number(userId));
  const [vehicleId, setVehicleId] = useState(prefill.vehicleId || customer?.vehicles[0]?.id || 0);
  const [items, setItems] = useState(prefill.items.length ? prefill.items : [{ description: "", category: "Repairing", qty: 1, unitPrice: "" }]);
  const [discount, setDiscount] = useState(0);
  const [taxPct, setTaxPct] = useState(defaultTax);
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const totals = useMemo(() => billTotals(items, discount, taxPct), [items, discount, taxPct]);

  function setItem(i, patch) {
    setItems((arr) => arr.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  }
  const vehicleType = customer?.vehicles.find((v) => v.id === Number(vehicleId))?.type;
  const priceFor = (s) => s.prices?.[vehicleType] ?? s.price; // owner price for this vehicle type, else base price
  function addFromCatalog(e) {
    const s = services.find((x) => x.id === Number(e.target.value));
    if (s) setItems((arr) => [...arr.filter((a) => a.description || a.unitPrice), { description: s.name, category: s.category, qty: 1, unitPrice: priceFor(s) }]);
    e.target.value = "";
  }
  function changeCustomer(id) {
    setUserId(Number(id));
    const c = customers.find((x) => x.id === Number(id));
    setVehicleId(c?.vehicles[0]?.id || 0);
  }
  function submit(e) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await createBill({ userId, vehicleId, jobId: prefill.jobId || null, items, discount, taxPct, paid, notes });
      if (res?.error) setError(res.error);
      else router.push(`/owner/bills/${res.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="grid bill-grid">
      <div className="stack">
        <div className="card">
          <h3>Customer &amp; vehicle</h3>
          <div className="form-grid">
            <div className="field">
              <label>Customer</label>
              <select value={userId} onChange={(e) => changeCustomer(e.target.value)} disabled={!!prefill.jobId}>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Vehicle</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(Number(e.target.value))} disabled={!!prefill.jobId}>
                {(customer?.vehicles || []).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
          </div>
          {prefill.jobId ? <p className="muted small" style={{ margin: 0 }}>Linked to job #{prefill.jobId}. Saving moves the job to “Ready” so the customer sees the final charge.</p> : null}
        </div>

        <div className="card items-edit">
          <div className="row between">
            <h3>Line items</h3>
            <select onChange={addFromCatalog} defaultValue="" style={{ maxWidth: 260 }}>
              <option value="">+ Add from service catalogue…</option>
              {CATEGORIES.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {services.filter((s) => s.category === cat).map((s) => <option key={s.id} value={s.id}>{s.name} — {money(priceFor(s))}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          {items.map((it, i) => (
            <div className="row-grid" key={i}>
              <input value={it.description} placeholder="Description" onChange={(e) => setItem(i, { description: e.target.value })} />
              <select value={it.category} onChange={(e) => setItem(i, { category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
              <input type="number" min="1" value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} />
              <input type="number" min="0" placeholder="Rate $" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: e.target.value })} />
              <span className="mono small right">{money((Number(it.qty) || 0) * (Number(it.unitPrice) || 0))}</span>
              <button type="button" className="btn-link danger" onClick={() => setItems((a) => a.filter((_, k) => k !== i))} aria-label="Remove">✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setItems((a) => [...a, { description: "", category: "Repairing", qty: 1, unitPrice: "" }])}>+ Add blank line</button>
        </div>

        <div className="card">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Notes shown on the bill (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 70 }} placeholder="e.g. 6-month warranty on brake pads" />
          </div>
        </div>
      </div>

      <div className="card bill-summary">
        <h3>Summary</h3>
        <div className="totals" style={{ width: "100%" }}>
          <div><span>Subtotal</span><span className="mono">{money(totals.subtotal)}</span></div>
          <div><span>Discount</span><span className="mono">− {money(totals.discount)}</span></div>
          <div><span>Tax ({taxPct}%)</span><span className="mono">{money(totals.tax)}</span></div>
          <div className="grand"><span>Total</span><span>{money(totals.total)}</span></div>
        </div>
        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="field">
            <label>Discount $</label>
            <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="field">
            <label>Tax %</label>
            <input type="number" min="0" max="40" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} />
          </div>
        </div>
        <label className="row small" style={{ marginBottom: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Already paid
        </label>
        {error && <div className="alert err">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={pending || !vehicleId}>{pending ? "Generating…" : "Generate bill"}</button>
      </div>
    </form>
  );
}
