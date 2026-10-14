"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { getOwnerPendingEstimates, sendJobEstimate, acceptJobRequest } from "@/app/actions";
import { money, prettyReg, fmtDateTime } from "@/lib/format";
import Icon from "@/components/Icon";

export default function OwnerEstimateAlert({ initialRequests = [] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyJobId, setBusyJobId] = useState(null);
  const [busy, startTransition] = useTransition();

  // Poll for incoming customer estimate requests every 5 seconds
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const next = await getOwnerPendingEstimates();
        if (next) {
          setRequests(next);
        }
      } catch (err) {
        // silent
      }
    }, 5000);

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
              style={{ width: 14, height: 14, background: unquotedCount > 0 ? "#dc2626" : "#ea580c" }}
            />
            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: unquotedCount > 0 ? "#991b1b" : "#c2410c", letterSpacing: "-0.01em" }}>
              🚨 {unquotedCount > 0
                ? `${unquotedCount} New Estimate ${unquotedCount === 1 ? "Request" : "Requests"} Pending Quote!`
                : `${pendingQuotes.length} Pending Service ${pendingQuotes.length === 1 ? "Booking" : "Bookings"}`}
            </span>
          </div>

          <span
            style={{
              background: unquotedCount > 0 ? "#dc2626" : "#ea580c",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: 8,
              fontSize: "0.78rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {unquotedCount > 0 ? "Action Required" : "Pending Acceptance"}
          </span>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: "0.88rem", color: "#7c2d12", fontWeight: 500 }}>
          {unquotedCount > 0
            ? "A customer submitted an estimate request for their vehicle. Review their issue and quote your price below so the customer can confirm!"
            : "Estimate sent to customer. Awaiting customer confirmation or vehicle arrival at the garage."}
        </p>

        {/* Requests List */}
        <div style={{ display: "grid", gap: 14 }}>
          {pendingQuotes.map((j) => {
            const needsQuote = !j.ownerQuoted && (!j.estMin || j.estMin === 0);
            return (
              <div
                key={j.id}
                style={{
                  background: "#ffffff",
                  border: needsQuote ? "2px solid #ea580c" : "1.5px solid #fdba74",
                  borderRadius: 14,
                  padding: "16px 18px",
                  boxShadow: "0 4px 14px rgba(234, 88, 12, 0.08)",
                }}
              >
                <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                  <div>
                    <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span
                        style={{
                          background: needsQuote ? "#fee2e2" : "#ffedd5",
                          color: needsQuote ? "#b91c1c" : "#9a3412",
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

              {/* Direct Quote Form */}
              <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <form
                  action={async (fd) => {
                    setBusyJobId(j.id);
                    startTransition(async () => {
                      await sendJobEstimate(fd);
                      setRequests((prev) => prev.filter((item) => item.id !== j.id));
                      setBusyJobId(null);
                    });
                  }}
                  className="row"
                  style={{ gap: 8, flexWrap: "wrap", alignItems: "center", flex: 1 }}
                >
                  <input type="hidden" name="jobId" value={j.id} />

                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className="small" style={{ fontWeight: 700, color: "#7c2d12" }}>Quote $:</span>
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
                    placeholder="Small note with estimate (e.g. Includes inspection & parts. Ready in 2 hours)"
                    defaultValue={j.ownerQuoted ? "" : "Estimate quoted. Please confirm to book your service."}
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
                </form>

                {/* Direct Accept Vehicle Action */}
                <form
                  action={async (fd) => {
                    setBusyJobId(j.id);
                    startTransition(async () => {
                      await acceptJobRequest(fd);
                      setRequests((prev) => prev.filter((item) => item.id !== j.id));
                      setBusyJobId(null);
                    });
                  }}
                >
                  <input type="hidden" name="jobId" value={j.id} />
                  <button
                    type="submit"
                    className="btn btn-dark btn-sm"
                    disabled={busy && busyJobId === j.id}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    Accept Vehicle 🔧
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
