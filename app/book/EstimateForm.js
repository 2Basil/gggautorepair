"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookJob } from "@/app/actions";

const EXAMPLES = [
  "Brake noise when stopping",
  "AC not cooling",
  "Full wash and interior cleaning",
  "Periodic service due",
  "Engine light on, car jerking",
  "Alloy wheels and music system",
];

export default function EstimateForm({ vehicles, initialVehicle, initialQuery, other }) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState(initialVehicle);
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function toggleChip(chip) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) {
        next.delete(chip);
      } else {
        next.add(chip);
      }
      const freeText = query
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && !EXAMPLES.includes(s))
        .join(", ");
      const chipText = [...next].join(", ");
      const combined = [chipText, freeText].filter(Boolean).join(", ");
      setQuery(combined);
      return next;
    });
  }

  function handleSubmit(e) {
    e?.preventDefault();
    setError("");
    start(async () => {
      const res = await bookJob(vehicleId, query);
      if (res.error) {
        setError(res.error);
      } else {
        router.push(`/track/${res.jobId}`);
      }
    });
  }

  return (
    <div className="stack">
      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label htmlFor="vehicle">Vehicle</label>
          <select
            id="vehicle"
            value={vehicleId}
            onChange={(e) => setVehicleId(Number(e.target.value))}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="q">Describe the problem or the service you want</label>
          <textarea
            id="q"
            autoFocus={other}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              other
                ? "Write your own request — tell us what your car needs…"
                : "e.g. There is a squealing noise when I brake, and I would also like a full wash."
            }
          />
        </div>

        <div className="chips">
          {EXAMPLES.map((x) => (
            <button
              type="button"
              key={x}
              className={`chip${selected.has(x) ? " chip-active" : ""}`}
              onClick={() => toggleChip(x)}
              aria-pressed={selected.has(x)}
            >
              {selected.has(x) && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  style={{ marginRight: 4, flexShrink: 0, verticalAlign: "middle" }}
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {x}
            </button>
          ))}
        </div>

        <div
          style={{
            background: "rgba(200, 69, 43, 0.05)",
            border: "1px dashed rgba(200, 69, 43, 0.3)",
            borderRadius: 12,
            padding: "12px 14px",
            margin: "8px 0 16px",
            fontSize: "0.85rem",
            color: "#4a3b32",
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 2 }}>
            📋 Manual Owner Estimate
          </div>
          Our garage owner will personally review your vehicle issue and send you an accurate price estimate. You can review and confirm the quote before any work starts.
        </div>

        {error && <div className="alert err">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={pending || query.trim().length < 3}
          style={{ fontSize: "1.02rem", padding: "14px 20px" }}
        >
          {pending ? "Submitting Request…" : "Get Estimate from Garage Owner 🔔"}
        </button>
      </form>
    </div>
  );
}
