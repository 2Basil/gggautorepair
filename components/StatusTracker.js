"use client";

import { SHOW_PRICES } from "@/lib/settings";
import { estimateState } from "@/lib/estimateState";
import { useActionState, useEffect, useState } from "react";
import { getJobStatus, customerCancelJob, rescheduleJob, customerAcceptEstimate } from "@/app/actions";
import { STEPS, STATUS_LABEL } from "@/lib/config";
import { fmtDateTime, money } from "@/lib/format";
import Icon from "./Icon";

function MiniCar() {
  return (
    <svg viewBox="0 0 70 36" aria-hidden="true">
      <path d="M4 26 L4 19 Q4 16 8 15 L18 14 C22 8 27 6 33 6 L43 6 C49 7 52 10 55 14 L63 16 Q67 17 67 21 L67 26 Z" fill="#C8452B" stroke="#F7F1E3" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M21 14 C24 10 28 9 33 9 L42 9 C46 10 49 12 51 14 Z" fill="#CFE3E6" />
      <circle cx="19" cy="27" r="6" fill="#22262E" stroke="#F7F1E3" strokeWidth="1.5" />
      <circle cx="53" cy="27" r="6" fill="#22262E" stroke="#F7F1E3" strokeWidth="1.5" />
      <circle cx="19" cy="27" r="2" fill="#F7F1E3" />
      <circle cx="53" cy="27" r="2" fill="#F7F1E3" />
    </svg>
  );
}

/** Minimum date string for the date picker (today) */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ReschedulePanel({ jobId }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(rescheduleJob, null);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--line)" }}>
      {state?.ok && (
        <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "10px 14px", fontSize: "0.85rem", color: "#065f46", marginBottom: 10 }}>
          ✅ {state.ok}
        </div>
      )}
      <details open={open} onToggle={(e) => setOpen(e.target.open)} className="small">
        <summary style={{ cursor: "pointer", color: "var(--muted)", fontWeight: 600, userSelect: "none" }}>
          📅 Request a reschedule
        </summary>
        <div style={{ marginTop: 10, padding: "16px", background: "linear-gradient(135deg,#f0f9ff,#e0f2fe)", borderRadius: 12, border: "1px solid #bae6fd" }}>
          <p className="tiny muted" style={{ marginBottom: 12 }}>
            Need a different date or time? Submit a reschedule request and the garage will confirm availability shortly.
          </p>
          <form action={action} style={{ display: "grid", gap: 10 }}>
            <input type="hidden" name="jobId" value={jobId} />
            {state?.error && (
              <div style={{ background: "#fff1f0", borderRadius: 8, padding: "8px 12px", color: "#b91c1c", fontSize: "0.82rem" }}>{state.error}</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", marginBottom: 4, color: "#0369a1" }}>
                  Preferred date *
                </label>
                <input
                  type="date"
                  name="preferredDate"
                  min={todayStr()}
                  required
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #bae6fd", fontSize: "0.88rem" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", marginBottom: 4, color: "#0369a1" }}>
                  Preferred time
                </label>
                <select
                  name="preferredTime"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #bae6fd", fontSize: "0.88rem" }}
                >
                  <option value="">Any time</option>
                  <option value="Morning (9am–12pm)">Morning (9am–12pm)</option>
                  <option value="Afternoon (12pm–4pm)">Afternoon (12pm–4pm)</option>
                  <option value="Evening (4pm–7pm)">Evening (4pm–7pm)</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", marginBottom: 4, color: "#0369a1" }}>
                Note (optional)
              </label>
              <input
                type="text"
                name="note"
                placeholder="Any additional info for the garage…"
                maxLength={200}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #bae6fd", fontSize: "0.88rem" }}
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              style={{
                padding: "10px 16px", background: pending ? "#93c5fd" : "#0284c7",
                color: "#fff", border: "none", borderRadius: 8,
                fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", fontSize: "0.9rem",
              }}
            >
              {pending ? "Sending request…" : "📅 Send reschedule request"}
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}

export default function StatusTracker({ jobId, initial, estMin, estMax, vehicleLabel, query, code, jobItems }) {
  const [data, setData] = useState(initial);

  useEffect(() => {
    if (["DELIVERED", "CANCELLED"].includes(data.status)) return;
    const t = setInterval(async () => {
      const next = await getJobStatus(jobId);
      if (next) setData(next);
    }, 8000);
    return () => clearInterval(t);
  }, [jobId, data.status]);

  const cancelled = data.status === "CANCELLED";
  const idx = Math.max(0, STEPS.findIndex((s) => s.key === data.status));
  const pct = (idx / (STEPS.length - 1)) * 100;
  const current = STEPS[idx] || STEPS[0];
  const logFor = (key) => [...(data.logs || [])].reverse().find((l) => l.status === key);
  const done = data.status === "DELIVERED";

  const currentEstMin = data.estMin ?? estMin;
  const currentEstMax = data.estMax ?? estMax;
  const items = data.items || jobItems || [];
  const subtotal = items.reduce((acc, i) => acc + (Number(i.qty) || 1) * (Number(i.unitPrice) || 0), 0);

  // Check if owner sent a custom estimate note
  // Check if owner sent a manual estimate quote
  const estimateLog = [...(data.logs || [])].reverse().find((l) => l.note?.toLowerCase().includes("estimate sent:"));
  const customerAccepted = estimateState(data).accepted;
  const hasEstimate = estimateState(data).quoted && (currentEstMin > 0 || currentEstMax > 0);

  // Extract owner note text (stripping the price prefix)
  const ownerNoteText = estimateState(data).ownerNote;

  return (
    <div>
      {/* Flash notification banner when estimate is ready / active (only during starting phase before paid) */}
      {!cancelled && !done && !data.bill?.paid && (
        <div
          className="notif-flash"
          style={{
            marginBottom: 20,
            background: hasEstimate
              ? "linear-gradient(135deg, rgba(200, 69, 43, 0.08), rgba(200, 69, 43, 0.03))"
              : "linear-gradient(135deg, #fef3c7, #fef9c3)",
            borderColor: hasEstimate ? "rgba(200, 69, 43, 0.3)" : "#f59e0b",
          }}
        >
          <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <div className="row" style={{ gap: 12, alignItems: "flex-start", flex: 1, minWidth: 260 }}>
              <span
                className="pulse"
                style={{ width: 14, height: 14, marginTop: 4, background: hasEstimate ? "var(--accent)" : "#d97706" }}
              />
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    color: hasEstimate ? "var(--accent)" : "#b45309",
                  }}
                >
                  {hasEstimate
                    ? `🔔 Garage Owner's Estimate: ${money(currentEstMin)}${currentEstMin !== currentEstMax ? ` – ${money(currentEstMax)}` : ""}`
                    : "⏳ Estimate Request Sent — Waiting for Owner's Price Quote"}
                </div>

                {hasEstimate && ownerNoteText && (
                  <div
                    style={{
                      background: "rgba(200,69,43,0.06)",
                      borderLeft: "3px solid var(--accent)",
                      borderRadius: "0 6px 6px 0",
                      padding: "6px 10px",
                      marginTop: 6,
                      fontSize: "0.88rem",
                      color: "#431407",
                    }}
                  >
                    <b>Owner's Note:</b> <i>“{ownerNoteText}”</i>
                  </div>
                )}

                <div className="small muted" style={{ marginTop: 4, color: hasEstimate ? "#4b5563" : "#78350f" }}>
                  {hasEstimate
                    ? customerAccepted
                      ? "You accepted this estimate and booked your service. Please bring your vehicle to the garage."
                      : "Review the owner's price quote above. You can now Book your service or Decline if you do not wish to proceed."
                    : "Our garage owner is personally reviewing your vehicle request and will quote an estimated price with a note. Once received, you can choose whether to Book or Decline."}
                </div>
              </div>
            </div>

            <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {hasEstimate && !customerAccepted && (
                <>
                  <form action={customerAcceptEstimate}>
                    <input type="hidden" name="jobId" value={jobId} />
                    <button className="btn btn-primary btn-sm" style={{ fontWeight: 800, padding: "8px 16px" }}>
                      ✓ Book My Service &amp; Accept Estimate
                    </button>
                  </form>

                  <form action={customerCancelJob}>
                    <input type="hidden" name="jobId" value={jobId} />
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: "#b91c1c", borderColor: "#fca5a5" }}
                      title="Decline this estimate"
                    >
                      ✕ Decline
                    </button>
                  </form>
                </>
              )}

              {customerAccepted && (
                <span className="badge paid" style={{ fontSize: "0.84rem", fontWeight: 800, padding: "5px 12px" }}>
                  ✓ Service Booked &amp; Estimate Accepted
                </span>
              )}

              <span className={`badge ${data.status}`}>{STATUS_LABEL[data.status]}</span>
            </div>
          </div>
        </div>
      )}

      <div className="track-grid">
        <div className="stack">
          <div className="track-hero">
            <span className="pill">{!done && !cancelled && <i className="pulse" />} {code} · {vehicleLabel}</span>
            <h2>{cancelled ? "This request was cancelled" : current.title}</h2>
            <p>{cancelled ? "Please contact the garage if this was a mistake or you wish to re-open." : current.desc}</p>
            {!cancelled && (
              <div className="road">
                <div className="road-line" />
                <div className="road-fill" style={{ width: `${pct}%` }} />
                <div className="road-stops">
                  {STEPS.map((s, i) => <i key={s.key} className={i <= idx ? "done" : ""} />)}
                </div>
                <div className="road-car" style={{ left: `${Math.min(Math.max(pct, 6), 94)}%` }}><MiniCar /></div>
              </div>
            )}
            {!cancelled && (
              <div className="row between tiny road-labels" style={{ color: "#cfc8b6" }}>
                {STEPS.map((s, i) => <span key={s.key} className={i === idx ? "cur" : ""} style={{ color: i <= idx ? "#fff" : undefined, fontWeight: i === idx ? 700 : 500 }}>{s.label}</span>)}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 18 }}>Progress timeline</h3>
            <ol className={`timeline ${cancelled ? "cancelled" : ""}`}>
              {STEPS.map((s, i) => {
                const state = cancelled
                  ? (i <= (idx === -1 ? 0 : idx) ? "done" : "todo")
                  : (i < idx || done ? "done" : i === idx ? "now" : "todo");
                const log = logFor(s.key);
                return (
                  <li key={s.key} className={`tl ${state}`}>
                    <span className="dot">
                      {state === "done" ? (
                        <Icon name="check" size={18} stroke={3} />
                      ) : (
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{i + 1}</span>
                      )}
                    </span>
                    <div>
                      <h4>{s.title}</h4>
                      <p>{log?.note && log.note !== "Request received" ? log.note : s.desc}</p>
                      {log && <div className="when">{fmtDateTime(log.at || log.createdAt)}</div>}
                    </div>
                  </li>
                );
              })}
              {cancelled && (
                <li className="tl cancelled done">
                  <span className="dot" style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}>
                    <Icon name="x" size={18} stroke={3} />
                  </span>
                  <div>
                    <h4 style={{ color: "#dc2626" }}>Cancelled / Stepped back</h4>
                    <p style={{ color: "#991b1b" }}>
                      {logFor("CANCELLED")?.note || "This service request was cancelled."}
                    </p>
                    {logFor("CANCELLED") && (
                      <div className="when">{fmtDateTime(logFor("CANCELLED").at || logFor("CANCELLED").createdAt)}</div>
                    )}
                  </div>
                </li>
              )}
            </ol>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h3>Your service request</h3>
            <p className="muted" style={{ marginBottom: 0 }}>"{query}"</p>
          </div>

          <div className="card">
            <div className="row between" style={{ alignItems: "baseline", marginBottom: 10 }}>
              <h3>Charges portal</h3>
              <span className={`badge ${data.status}`}>{STATUS_LABEL[data.status]}</span>
            </div>

            {/* 1. First: Estimated price (Only shown during starting phase; once bill is paid, estimate is removed) */}
            {data.bill?.paid ? (
              <div style={{ background: "#dff1e6", color: "#1d5a3f", padding: "12px 16px", borderRadius: 12, marginBottom: 14 }}>
                <div className="tiny uppercase" style={{ fontWeight: 700, letterSpacing: "0.08em" }}>Final Bill Paid &amp; Completed</div>
                <div className="row between" style={{ alignItems: "baseline", marginTop: 4 }}>
                  <b style={{ fontSize: "1.35rem" }}>{money(data.bill.total)}</b>
                  <span className="badge paid">Paid in Full</span>
                </div>
                <p className="tiny" style={{ margin: "4px 0 0" }}>
                  Thank you for your visit! All services and fault repairs have been settled.
                </p>
              </div>
            ) : SHOW_PRICES.estimate && !done && (
              <div style={{ background: "var(--cream-2)", padding: "12px 16px", borderRadius: 12, marginBottom: 14 }}>
                <div className="tiny muted uppercase" style={{ fontWeight: 700, letterSpacing: "0.08em" }}>1. Garage Estimate (Starting Phase)</div>
                {hasEstimate ? (
                  <>
                    <div className="row between" style={{ alignItems: "baseline", marginTop: 4 }}>
                      <b style={{ fontSize: "1.35rem", color: "var(--accent)" }}>
                        {money(currentEstMin)}{currentEstMin !== currentEstMax ? ` – ${money(currentEstMax)}` : ""}
                      </b>
                      <span className="tiny muted">Owner's manual quote</span>
                    </div>
                    {ownerNoteText && (
                      <p className="tiny" style={{ margin: "4px 0 0", color: "#431407" }}>
                        Note: <i>“{ownerNoteText}”</i>
                      </p>
                    )}
                  </>
                ) : (
                  <div style={{ marginTop: 4 }}>
                    <b style={{ fontSize: "1.05rem", color: "#b45309" }}>⏳ Pending Owner Price Quote</b>
                    <p className="tiny muted" style={{ margin: "4px 0 0" }}>
                      Our garage owner will send you an estimated price quote with a note shortly. You can then accept and book your service.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 2. Then: All amounts which will get updated by owner */}
            <div style={{ marginTop: 8 }}>
              <div className="row between" style={{ alignItems: "center", marginBottom: 8 }}>
                <b className="small">2. Work items &amp; Fault charges</b>
                <span className="badge" style={{ fontSize: "0.75rem" }}>{items.length} {items.length === 1 ? "item" : "items"}</span>
              </div>

              {items.length > 0 ? (
                <div className="table-scroll" style={{ maxHeight: 280, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>
                  <table className="tbl" style={{ fontSize: "0.86rem", margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Item / Fault</th>
                        <th>Category</th>
                        <th className="num">Qty</th>
                        <th className="num">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, k) => (
                        <tr key={it.id || k}>
                          <td><b>{it.description}</b></td>
                          <td className="muted tiny">{it.category || "Repairing"}</td>
                          <td className="num">{it.qty || 1}</td>
                          <td className="num mono"><b>{money((Number(it.qty) || 1) * (Number(it.unitPrice) || 0))}</b></td>
                        </tr>
                      ))}
                      <tr style={{ background: "var(--cream-2)" }}>
                        <td colSpan={3}><b>Current subtotal</b></td>
                        <td className="num mono"><b>{money(subtotal)}</b></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty" style={{ padding: "16px 10px", fontSize: "0.85rem" }}>
                  No itemized charges added yet. Any new fault, washing, or repair charge will appear here live.
                </div>
              )}
            </div>

            {data.bill ? (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <div className="row between" style={{ alignItems: "baseline", marginBottom: 12 }}>
                  <span className="muted">Final Bill Total</span>
                  <b style={{ fontSize: "1.4rem", color: "var(--ink)" }}>{money(data.bill.total)}</b>
                </div>

                {data.bill.paid ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "#f0fdf4",
                      border: "1.5px solid #86efac",
                      borderRadius: 12,
                      padding: "12px 16px",
                    }}
                  >
                    <span style={{ fontSize: "1.4rem" }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 800, color: "#15803d", fontSize: "0.92rem" }}>
                        Paid in Full — Thank you!
                      </div>
                      <div className="tiny muted" style={{ marginTop: 2 }}>
                        All services have been settled. Your receipt is available online.
                      </div>
                    </div>
                    <Link href={`/bills/${data.bill.id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
                      View receipt
                    </Link>
                  </div>
                ) : (
                  <div>
                    {/* Prominent Pay Now button */}
                    <Link
                      href={`/bills/${data.bill.id}#payment`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        padding: "15px 22px",
                        background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                        color: "#fff",
                        borderRadius: 14,
                        fontWeight: 900,
                        fontSize: "1.05rem",
                        textDecoration: "none",
                        boxShadow: "0 6px 22px rgba(37,99,235,0.38)",
                        marginBottom: 10,
                        transition: "opacity 0.15s",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      🔒 Pay {money(data.bill.total)} Now — Online
                    </Link>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                      <span className={`badge unpaid`} style={{ fontSize: "0.78rem" }}>Payment Due</span>
                      <Link href={`/bills/${data.bill.id}`} className="btn-link small muted">
                        View full invoice →
                      </Link>
                    </div>
                    <p className="tiny muted" style={{ marginTop: 8, textAlign: "center" }}>
                      Pay instantly via Credit/Debit Card, Zelle, PayPal, Cash App, and more.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="tiny muted" style={{ marginTop: 12, marginBottom: 0 }}>
                Charges are automatically compiled into the final bill once repairs and quality check are complete.
              </p>
            )}

            {/* 4. Reschedule option */}
            {!cancelled && !done && (
              <ReschedulePanel jobId={jobId} />
            )}

            {/* 5. Option to step back if customer doesn't want to afford additional money */}
            {!cancelled && !done && (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--line)" }}>
                <details className="small">
                  <summary style={{ cursor: "pointer", color: "var(--muted)", fontWeight: 600 }}>
                    Need to step back from service?
                  </summary>
                  <div style={{ marginTop: 8, padding: 12, background: "#fff8f6", borderRadius: 10, border: "1px solid #fed7d7" }}>
                    <p className="tiny muted" style={{ marginBottom: 10 }}>
                      If any new fault or updated charges exceed your budget, you can step back before further work is done. The garage can close the case with only approved charges.
                    </p>
                    <form action={customerCancelJob}>
                      <input type="hidden" name="jobId" value={jobId} />
                      <input type="hidden" name="reason" value="Customer stepped back due to repair charges." />
                      <button className="btn btn-ghost btn-sm" style={{ color: "#c53030", borderColor: "#feb2b2" }}>
                        Cancel / Step back from request
                      </button>
                    </form>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
