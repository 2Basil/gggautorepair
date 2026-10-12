"use client";

import { useState } from "react";
import { STEPS, STATUS_LABEL } from "@/lib/config";
import { fmtDateTime } from "@/lib/format";
import Icon from "./Icon";
import { updateJobStatus } from "@/app/actions";

export default function OwnerTimelineManager({ jobId, currentStatus, logs = [] }) {
  const cancelled = currentStatus === "CANCELLED";
  const done = currentStatus === "DELIVERED";
  const currentIdx = Math.max(0, STEPS.findIndex((s) => s.key === currentStatus));

  // Find latest log for any status
  const logFor = (key) => [...logs].reverse().find((l) => l.status === key);
  const cancelledLog = [...logs].reverse().find((l) => l.status === "CANCELLED");

  // Keep state for each step's note input (max 100 characters)
  const [notes, setNotes] = useState(() => {
    const initial = {};
    STEPS.forEach((s) => {
      const existing = logFor(s.key)?.note;
      initial[s.key] = existing && existing !== "Request received" ? existing : "";
    });
    initial["CANCELLED"] = cancelledLog?.note || "";
    return initial;
  });

  const handleNoteChange = (key, val) => {
    // strictly truncate at 100 characters
    setNotes((prev) => ({ ...prev, [key]: val.slice(0, 100) }));
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="row between" style={{ alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0 }}>Progress timeline &amp; Status Controls</h3>
          <p className="muted small" style={{ margin: "3px 0 0" }}>
            The customer sees this same timeline live. Mark any status and write up to 100 characters beside each step.
          </p>
        </div>
        <span className={`badge ${currentStatus}`} style={{ fontSize: "0.85rem", padding: "4px 12px" }}>
          {STATUS_LABEL[currentStatus] || currentStatus}
        </span>
      </div>

      <ol className={`timeline ${cancelled ? "cancelled" : ""}`}>
        {STEPS.map((s, i) => {
          const isDone = !cancelled && (i < currentIdx || done);
          const isCurrent = !cancelled && i === currentIdx;
          const state = cancelled
            ? (i <= (currentIdx === -1 ? 0 : currentIdx) ? "done" : "todo")
            : (isDone ? "done" : isCurrent ? "now" : "todo");
          const log = logFor(s.key);
          const noteVal = notes[s.key] ?? "";
          const charsLeft = 100 - noteVal.length;

          return (
            <li key={s.key} className={`tl ${state}`}>
              <span className="dot">
                {state === "done" ? (
                  <Icon name="check" size={18} stroke={3} />
                ) : isCurrent ? (
                  <Icon name="check" size={18} stroke={2.5} />
                ) : (
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{i + 1}</span>
                )}
              </span>

              <div style={{ minWidth: 0 }}>
                <div className="row between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
                  <h4 style={{ margin: 0 }}>
                    {s.title}{" "}
                    {isCurrent && (
                      <span className="badge" style={{ background: "#dcfce7", color: "#166534", fontSize: "0.72rem", marginLeft: 6 }}>
                        ● Active Status
                      </span>
                    )}
                  </h4>
                  {log && (
                    <span className="when muted tiny">
                      Logged {fmtDateTime(log.createdAt || log.at)}
                    </span>
                  )}
                </div>

                <p style={{ margin: "2px 0 8px", fontSize: "0.86rem", color: "#6b7280" }}>
                  {log?.note && log.note !== "Request received" ? log.note : s.desc}
                </p>

                {/* Status action & note form (up to 100 characters) */}
                <div className={`tl-action-box ${isCurrent ? "is-current" : ""}`}>
                  <form action={updateJobStatus}>
                    <input type="hidden" name="jobId" value={jobId} />
                    <input type="hidden" name="status" value={s.key} />

                    <div className="tl-input-row">
                      <input
                        name="note"
                        value={noteVal}
                        onChange={(e) => handleNoteChange(s.key, e.target.value)}
                        maxLength={100}
                        placeholder={`Write note for ${s.label.toLowerCase()} (max 100 chars)...`}
                        title="Maximum 100 characters for customer note"
                      />

                      <span
                        className={`tl-char-badge ${charsLeft <= 10 ? "limit-warn" : ""}`}
                        title={`${noteVal.length} / 100 characters used`}
                      >
                        {noteVal.length}/100
                      </span>

                      <button
                        type="submit"
                        className={`btn btn-sm ${isCurrent ? "btn-ghost" : "btn-primary"}`}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {isCurrent ? "Update note" : `Mark as ${s.label}`}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </li>
          );
        })}

        {/* Cancellation row */}
        <li className={`tl ${cancelled ? "cancelled done" : "todo"}`}>
          <span className="dot" style={cancelled ? { background: "#dc2626", borderColor: "#dc2626", color: "#fff" } : {}}>
            <Icon name="x" size={18} stroke={3} />
          </span>

          <div style={{ minWidth: 0 }}>
            <div className="row between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
              <h4 style={{ margin: 0, color: cancelled ? "#dc2626" : "inherit" }}>
                Cancelled / Stepped back
                {cancelled && (
                  <span className="badge" style={{ background: "#fee2e2", color: "#991b1b", fontSize: "0.72rem", marginLeft: 6 }}>
                    ● Currently Cancelled (Line Red)
                  </span>
                )}
              </h4>
              {cancelledLog && (
                <span className="when muted tiny">
                  Logged {fmtDateTime(cancelledLog.createdAt || cancelledLog.at)}
                </span>
              )}
            </div>

            <p style={{ margin: "2px 0 8px", fontSize: "0.86rem", color: cancelled ? "#991b1b" : "#6b7280" }}>
              {cancelledLog?.note || "Mark this request as cancelled if customer steps back. Turns status line RED."}
            </p>

            <div className={`tl-action-box ${cancelled ? "is-cancelled" : ""}`}>
              <form action={updateJobStatus}>
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="status" value="CANCELLED" />

                <div className="tl-input-row">
                  <input
                    name="note"
                    value={notes["CANCELLED"] ?? ""}
                    onChange={(e) => handleNoteChange("CANCELLED", e.target.value)}
                    maxLength={100}
                    placeholder="Cancellation reason / note (max 100 chars)..."
                    title="Maximum 100 characters for cancellation reason"
                  />

                  <span
                    className={`tl-char-badge ${(100 - (notes["CANCELLED"] || "").length) <= 10 ? "limit-warn" : ""}`}
                  >
                    {(notes["CANCELLED"] || "").length}/100
                  </span>

                  <button
                    type="submit"
                    className="btn btn-sm btn-ghost"
                    style={{
                      whiteSpace: "nowrap",
                      color: "#dc2626",
                      borderColor: "#fca5a5",
                      background: cancelled ? "#fee2e2" : undefined,
                    }}
                  >
                    {cancelled ? "Update cancel reason" : "Mark as Cancelled"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </li>
      </ol>
    </div>
  );
}
