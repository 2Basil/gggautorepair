"use client";

import { useState } from "react";
import Link from "next/link";
import { generateJobBillFromItems, closeJobCase } from "@/app/actions";
import { money } from "@/lib/format";

export default function OwnerBillGenerator({ jobId, subtotal, defaultTax = 18, isPaid = false, paidBill = null }) {
  const [discount, setDiscount] = useState(0);
  const [taxPct, setTaxPct] = useState(defaultTax);
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");

  if (isPaid) {
    return (
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1.5px dashed var(--line)" }}>
        <div className="alert ok" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <b>✓ Bill {paidBill?.number || ""} Paid &amp; Completed</b>
            <div className="small">
              Total amount: <b>{money(paidBill?.total || subtotal)}</b> · Case settled and closed.
            </div>
          </div>
          {paidBill && (
            <Link href={`/owner/bills/${paidBill.id}`} className="btn btn-ghost btn-sm">
              View Final Bill →
            </Link>
          )}
        </div>
      </div>
    );
  }

  const discNum = Math.max(0, Number(discount) || 0);
  const taxNum = Math.min(40, Math.max(0, Number(taxPct) || 0));
  const subAfterDiscount = Math.max(0, subtotal - discNum);
  const taxAmt = Math.round((subAfterDiscount * taxNum) / 100);
  const totalAmt = subAfterDiscount + taxAmt;

  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1.5px dashed var(--line)" }}>
      <div className="row between" style={{ alignItems: "center", marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontSize: "1.05rem" }}>Generate Final Bill &amp; Close Case</h4>
        <span className="tiny muted">Auto-calculates from above work items</span>
      </div>

      <form action={generateJobBillFromItems}>
        <input type="hidden" name="jobId" value={jobId} />

        <div className="grid grid-2" style={{ gap: 14, marginBottom: 14 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Discount ($) — reduced from total</label>
            <input
              type="number"
              name="discount"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
            />
            <span className="hint">Manually write an amount to reduce charges for the customer</span>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label>Tax %</label>
            <input
              type="number"
              name="taxPct"
              min="0"
              max="40"
              value={taxPct}
              onChange={(e) => setTaxPct(e.target.value)}
            />
            <span className="hint">Standard tax percentage (default {defaultTax}%)</span>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>Bill notes / warranty info (optional)</label>
          <input
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 6 months warranty on replaced parts, road tested"
          />
        </div>

        <label className="row small" style={{ marginBottom: 14, cursor: "pointer", display: "inline-flex", gap: 8 }}>
          <input
            type="checkbox"
            name="paid"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
          />
          <b>Mark as already paid at garage counter</b>
        </label>

        {/* Live calculated summary box */}
        <div style={{ background: "var(--cream)", padding: "14px 18px", borderRadius: 12, marginBottom: 16 }}>
          <div className="row between small" style={{ marginBottom: 4 }}>
            <span className="muted">Work Subtotal:</span>
            <span className="mono font-bold">{money(subtotal)}</span>
          </div>
          {discNum > 0 && (
            <div className="row between small" style={{ marginBottom: 4, color: "#c53030" }}>
              <span>Manual Discount:</span>
              <span className="mono font-bold">− {money(discNum)}</span>
            </div>
          )}
          <div className="row between small" style={{ marginBottom: 6 }}>
            <span className="muted">Tax ({taxNum}%):</span>
            <span className="mono">{money(taxAmt)}</span>
          </div>
          <div className="row between" style={{ borderTop: "1px solid var(--line)", paddingTop: 8, alignItems: "baseline" }}>
            <b>Calculated Final Total:</b>
            <b style={{ fontSize: "1.35rem", color: "var(--accent)" }}>{money(totalAmt)}</b>
          </div>
        </div>

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-primary">
            Generate final bill ({money(totalAmt)}) →
          </button>
        </div>
      </form>

      {/* Option if user stepped back / wants to cancel */}
      <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px dotted var(--line)" }}>
        <form action={closeJobCase} className="row between" style={{ alignItems: "center" }}>
          <input type="hidden" name="jobId" value={jobId} />
          <span className="tiny muted">If customer chose to step back from repair due to cost:</span>
          <button className="btn-link danger tiny">
            Close case without billing (Mark Cancelled)
          </button>
        </form>
      </div>
    </div>
  );
}
