"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { getOwnerPendingEstimates, sendJobEstimate, ownerBookJob, ownerDeclineJob } from "@/app/actions";
import { money, prettyReg, fmtDateTime } from "@/lib/format";

export default function OwnerEstimateAlert({ initialRequests = [] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyJobId, setBusyJobId] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [busy, startTransition] = useTransition();

  // Play a soft notification chime on new estimate requests
  function playAlertChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // Audio not permitted or not supported
    }
  }

  // Poll for incoming customer estimate requests every 3 seconds for instant real-time sync
  useEffect(() => {
    let lastUnquoted = requests.filter((r) => !r.ownerQuoted || !r.estMin || r.estMin === 0).length;

    const timer = setInterval(async () => {
      try {
        const next = await getOwnerPendingEstimates();
        if (next) {
          const newUnquoted = next.filter((r) => !r.ownerQuoted || !r.estMin || r.estMin === 0).length;
          if (newUnquoted > lastUnquoted) {
            playAlertChime();
          }
          lastUnquoted = newUnquoted;
          setRequests(next);
        }
      } catch {
        // silent
      }
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  // Filter for jobs that are BOOKED / waiting for quote or starting estimate
  const pendingQuotes = requests.filter((r) => r.status === "BOOKED" || r.estMin === 0);
  const unquotedCount = pendingQuotes.filter((r) => !r.ownerQuoted || !r.estMin || r.estMin === 0).length;

  if (pendingQuotes.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }} className="no-print">
      <div className="notif-flash-urgent">
        {/* Top Header of the Alert */}
        <div className="row between" style={{ alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <span
              className="pulse"
              style={{ width: 14, height: 14, background: unquotedCount > 0 ? "#dc2626" : "#16a34a" }}
            />
            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: unquotedCount > 0 ? "#991b1b" : "#15803d", letterSpacing: "-0.01em" }}>
              {unquotedCount > 0
                ? `🚨 ${unquotedCount} New Estimate ${unquotedCount === 1 ? "Request" : "Requests"} Pending Quote!`
                : `📋 ${pendingQuotes.length} Estimate ${pendingQuotes.length === 1 ? "Sent" : "Sent"} — Ready to Book or Decline`}
            </span>
          </div>

          <span
            style={{
              background: unquotedCount > 0 ? "#dc2626" : "#16a34a",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: 8,
              fontSize: "0.78rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {unquotedCount > 0 ? "Quote Price Required" : "Ready for Book / Decline"}
          </span>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: "0.88rem", color: unquotedCount > 0 ? "#7c2d12" : "#14532d", fontWeight: 500 }}>
          {unquotedCount > 0
            ? "A customer submitted an estimate request for their vehicle. Review their issue and quote your price below so the customer can confirm!"
            : "Estimate price has been sent to customer. You can now Book the service to start repairs or Decline the request."}
        </p>

        {/* Requests List */}
        <div style={{ display: "grid", gap: 14 }}>
          {pendingQuotes.map((j) => {
            const needsQuote = !j.ownerQuoted || !j.estMin || j.estMin === 0;
            const isEditing = editingJobId === j.id;

            return (
              <div
                key={j.id}
                style={{
                  background: "#ffffff",
                  border: needsQuote ? "2px solid #ea580c" : "2px solid #22c55e",
                  borderRadius: 14,
                  padding: "16px 18px",
                  boxShadow: needsQuote ? "0 4px 14px rgba(234, 88, 12, 0.08)" : "0 4px 14px rgba(34, 197, 94, 0.08)",
                }}
              >
                <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                  <div>
                    <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span
                        style={{
                          background: needsQuote ? "#fee2e2" : "#dcfce7",
                          color: needsQuote ? "#b91c1c" : "#15803d",
                          fontWeight: 800,
                          fontSize: "0.76rem",
                          padding: "2px 7px",
                          borderRadius: 6,
                        }}
                      >
                        {j.code}
                      </span>
                      {needsQuote ? (
                        <span style={{ background: "#dc2626", color: "#fff", fontWeight: 800, fontSize: "0.72rem", padding: "2px 8px", borderRadius: 6 }}>
                          ⚠️ QUOTE NEEDED
                        </span>
                      ) : (
                        <span style={{ background: "#16a34a", color: "#fff", fontWeight: 800, fontSize: "0.72rem", padding: "2px 8px", borderRadius: 6 }}>
                          ✓ ESTIMATE SENT {money(j.estMin)}{j.estMax !== j.estMin ? ` – ${money(j.estMax)}` : ""}
                        </span>
                      )}
                      {j.customerAccepted && (
                        <span className="badge paid" style={{ fontSize: "0.72rem", fontWeight: 800, padding: "2px 8px" }}>
                          ✓ Customer Accepted Quote
                        </span>
                      )}
                      <b style={{ fontSize: "1.02rem", color: "#111827" }}>
                        {j.vehicle?.make || "Vehicle"} {j.vehicle?.model || ""}
                      </b>
                      {j.vehicle?.regNo && <span className="reg">{prettyReg(j.vehicle.regNo)}</span>}
                      {j.vehicle?.year && <span className="small muted">({j.vehicle.year})</span>}
                    </div>

                    <div className="small muted" style={{ marginTop: 4 }}>
                      Customer: <b>{j.user?.name || "Customer"}</b> · 📞 {j.user?.phone || "N/A"} · Requested {fmtDateTime(j.createdAt)}
                    </div>
                  </div>

                  <Link
                    href={`/owner/jobs/${j.id}`}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: "0.82rem" }}
                  >
                    Open Full Job Portal →
                  </Link>
                </div>

                {/* Customer Request / Query */}
                <div
                  style={{
                    background: "#fffaf0",
                    borderLeft: "3.5px solid #ea580c",
                    borderRadius: "0 8px 8px 0",
                    padding: "8px 12px",
                    fontSize: "0.92rem",
                    color: "#431407",
                    marginBottom: 12,
                  }}
                >
                  <span className="tiny uppercase" style={{ fontWeight: 800, color: "#9a3412", marginRight: 6 }}>
                    Customer Request:
                  </span>
                  <i>“{j.query}”</i>
                </div>

                {/* Step 1: When estimate price NOT sent yet OR editing price */}
                {(needsQuote || isEditing) ? (
                  <div style={{ background: "#fff7ed", border: "1px dashed #fdba74", borderRadius: 10, padding: 12 }}>
                    <div className="tiny uppercase" style={{ fontWeight: 800, color: "#c2410c", marginBottom: 6 }}>
                      {needsQuote ? "Step 1: Enter & Send Estimate Price to Customer" : "Update Estimate Price Quote"}
                    </div>
                    <form
                      action={async (fd) => {
                        setBusyJobId(j.id);
                        startTransition(async () => {
                          await sendJobEstimate(fd);
                          const minVal = parseInt(fd.get("estMin")) || 0;
                          const maxVal = parseInt(fd.get("estMax")) || minVal;
                          const noteVal = String(fd.get("note") || "");
                          setRequests((prev) =>
                            prev.map((item) =>
                              item.id === j.id
                                ? {
                                    ...item,
                                    ownerQuoted: true,
                                    estMin: Math.min(minVal, maxVal),
                                    estMax: Math.max(minVal, maxVal),
                                    ownerNote: noteVal,
                                  }
                                : item
                            )
                          );
                          setEditingJobId(null);
                          setBusyJobId(null);
                        });
                      }}
                      className="row"
                      style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}
                    >
                      <input type="hidden" name="jobId" value={j.id} />

                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span className="small" style={{ fontWeight: 700, color: "#7c2d12" }}>Price $:</span>
                        <input
                          type="number"
                          name="estMin"
                          defaultValue={j.ownerQuoted && j.estMin > 0 ? j.estMin : ""}
                          placeholder="Min $"
                          required
                          disabled={busy && busyJobId === j.id}
                          style={{
                            width: 90,
                            padding: "7px 10px",
                            fontSize: "0.88rem",
                            borderRadius: 8,
                            border: "1.5px solid #ea580c",
                            background: "#fff",
                          }}
                          title="Estimated minimum price"
                        />
                        <span style={{ color: "#9a3412", fontWeight: 700 }}>–</span>
                        <input
                          type="number"
                          name="estMax"
                          defaultValue={j.ownerQuoted && j.estMax > 0 ? j.estMax : ""}
                          placeholder="Max $"
                          disabled={busy && busyJobId === j.id}
                          style={{
                            width: 90,
                            padding: "7px 10px",
                            fontSize: "0.88rem",
                            borderRadius: 8,
                            border: "1.5px solid #cbd5e1",
                            background: "#fff",
                          }}
                          title="Estimated maximum price"
                        />
                      </div>

                      <input
                        name="note"
                        placeholder="Note with estimate (e.g. Includes inspection & parts. Ready in 2 hours)"
                        defaultValue={j.ownerNote || (j.ownerQuoted ? "" : "Estimate quoted. Please confirm to book your service.")}
                        disabled={busy && busyJobId === j.id}
                        style={{
                          flex: 1,
                          minWidth: 200,
                          padding: "7px 10px",
                          fontSize: "0.85rem",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                        }}
                      />

                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={busy && busyJobId === j.id}
                        style={{ fontWeight: 800, padding: "8px 14px", gap: 6 }}
                      >
                        {busy && busyJobId === j.id ? "Sending…" : "Send Estimate to Customer 🔔"}
                      </button>

                      {isEditing && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setEditingJobId(null)}
                        >
                          Cancel
                        </button>
                      )}
                    </form>
                  </div>
                ) : (
                  /* Step 2: Once estimate price is sent -> Owner gets button for Book or Decline */
                  <div
                    style={{
                      background: "linear-gradient(135deg, #f0fdf4, #eafaf1)",
                      border: "1.5px solid #86efac",
                      borderRadius: 10,
                      padding: "12px 14px",
                    }}
                  >
                    <div className="row between" style={{ alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <span style={{ fontWeight: 800, color: "#166534", fontSize: "0.95rem" }}>
                          ✓ Estimate Price Sent: {money(j.estMin)}{j.estMax !== j.estMin ? ` – ${money(j.estMax)}` : ""}
                        </span>
                        {j.ownerNote && (
                          <span className="small muted" style={{ marginLeft: 8, color: "#15803d" }}>
                            · Note: “{j.ownerNote}”
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingJobId(j.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: "0.75rem", padding: "2px 8px", color: "#15803d" }}
                      >
                        ✏️ Edit Price
                      </button>
                    </div>

                    <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div className="small" style={{ color: "#166534", fontWeight: 600 }}>
                        {j.customerAccepted
                          ? "✓ Customer accepted your estimate! You can now start the repair workflow."
                          : "✓ Estimate quote sent to customer. Awaiting customer confirmation/booking."}
                      </div>

                      <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {/* Only show Start Repair if customer has accepted */}
                        {j.customerAccepted && (
                          <form
                            action={async (fd) => {
                              setBusyJobId(j.id);
                              startTransition(async () => {
                                await ownerBookJob(fd);
                                setRequests((prev) => prev.filter((item) => item.id !== j.id));
                                setBusyJobId(null);
                              });
                            }}
                          >
                            <input type="hidden" name="jobId" value={j.id} />
                            <button
                              type="submit"
                              className="btn btn-primary btn-sm"
                              disabled={busy && busyJobId === j.id}
                              style={{ fontWeight: 800, padding: "8px 16px", gap: 6, fontSize: "0.9rem" }}
                            >
                              {busy && busyJobId === j.id ? "Starting…" : "✓ Start Repair 🔧"}
                            </button>
                          </form>
                        )}

                        {/* Decline Button */}
                        <form
                          action={async (fd) => {
                            if (!window.confirm(`Are you sure you want to decline request ${j.code}?`)) return;
                            setBusyJobId(j.id);
                            startTransition(async () => {
                              await ownerDeclineJob(fd);
                              setRequests((prev) => prev.filter((item) => item.id !== j.id));
                              setBusyJobId(null);
                            });
                          }}
                        >
                          <input type="hidden" name="jobId" value={j.id} />
                          <button
                            type="submit"
                            className="btn btn-ghost btn-sm"
                            disabled={busy && busyJobId === j.id}
                            style={{ color: "#dc2626", borderColor: "#fca5a5", fontWeight: 700, padding: "8px 14px" }}
                          >
                            {busy && busyJobId === j.id ? "Declining…" : "✕ Decline"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
