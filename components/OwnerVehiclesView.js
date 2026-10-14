"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtDate, money, prettyReg } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/config";
import ContactButtons from "@/components/ContactButtons";
import { acceptJobRequest, sendJobEstimate } from "@/app/actions";

export default function OwnerVehiclesView({ requestedJobs = [], acceptedJobs = [] }) {
  const [tab, setTab] = useState("all"); // "all" | "requested" | "accepted"

  const allJobs = [...requestedJobs, ...acceptedJobs];
  const displayedJobs =
    tab === "requested"
      ? requestedJobs
      : tab === "accepted"
      ? acceptedJobs
      : allJobs;

  return (
    <div className="card" style={{ marginBottom: 20, padding: "20px 22px" }}>
      {/* Header with Title and Tabs */}
      <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 18 }}>
        <div>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>Vehicles Management</h3>
            <span className="badge" style={{ background: "var(--ink)", color: "var(--cream)", fontSize: "0.78rem" }}>
              {allJobs.length} Active in Garage
            </span>
          </div>
          <p className="muted small" style={{ margin: "3px 0 0" }}>
            Track requested vehicles waiting for estimate &amp; accepted vehicles currently under repair.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="tabs" style={{ margin: 0 }}>
          <button
            type="button"
            className={`btn-link ${tab === "all" ? "on" : ""}`}
            onClick={() => setTab("all")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: "0.85rem",
              background: tab === "all" ? "var(--ink)" : "transparent",
              color: tab === "all" ? "var(--cream)" : "var(--muted)",
            }}
          >
            All Vehicles ({allJobs.length})
          </button>
          <button
            type="button"
            className={`btn-link ${tab === "requested" ? "on" : ""}`}
            onClick={() => setTab("requested")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: "0.85rem",
              background: tab === "requested" ? "var(--ink)" : "transparent",
              color: tab === "requested" ? "var(--cream)" : "var(--muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ⏳ Requested ({requestedJobs.length})
            {requestedJobs.length > 0 && <span className="pulse" style={{ width: 7, height: 7, background: "var(--accent)" }} />}
          </button>
          <button
            type="button"
            className={`btn-link ${tab === "accepted" ? "on" : ""}`}
            onClick={() => setTab("accepted")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: "0.85rem",
              background: tab === "accepted" ? "var(--ink)" : "transparent",
              color: tab === "accepted" ? "var(--cream)" : "var(--muted)",
            }}
          >
            🔧 Accepted &amp; In-Repair ({acceptedJobs.length})
          </button>
        </div>
      </div>

      {/* Empty State */}
      {displayedJobs.length === 0 && (
        <div className="empty" style={{ padding: "36px 20px" }}>
          {tab === "requested"
            ? "No pending service requests. All vehicles have been accepted!"
            : tab === "accepted"
            ? "No vehicles currently under repair in the garage."
            : "No active vehicles in the garage right now."}
        </div>
      )}

      {/* Vehicles Grid / List */}
      <div style={{ display: "grid", gap: 16 }}>
        {displayedJobs.map((j) => {
          const isRequested = j.status === "BOOKED";
          const subtotal = (j.items || []).reduce((s, it) => s + (it.qty || 1) * (it.unitPrice || 0), 0);
          const paidBill = (j.bills || []).find((b) => b.paid);
          const isPaid = !!paidBill;

          return (
            <div
              key={j.id}
              style={{
                border: isRequested ? "1.5px solid rgba(200,69,43,0.3)" : "1px solid var(--line)",
                borderRadius: 16,
                padding: "16px 20px",
                background: isRequested ? "linear-gradient(180deg, #fffcf9 0%, #fff 100%)" : "#fff",
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
              }}
            >
              {/* Top Row: Vehicle Info & Status */}
              <div className="row between" style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <div>
                  <div className="row" style={{ gap: 9, alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: isRequested ? "#fee2e2" : "#e0e7ff",
                        color: isRequested ? "#991b1b" : "#3730a3",
                      }}
                    >
                      {isRequested ? "⏳ Requested" : "🔧 Accepted & In-Service"}
                    </span>
                    <b style={{ fontSize: "1.08rem" }}>{j.code}</b>
                    <span className="reg">{prettyReg(j.vehicle.regNo)}</span>
                    <span style={{ fontWeight: 700, fontSize: "1rem" }}>
                      {j.vehicle.make} {j.vehicle.model}
                    </span>
                    <span className={`badge ${j.status}`}>
                      {STATUS_LABEL[j.status] || j.status}
                    </span>
                  </div>

                  <div className="muted small" style={{ marginTop: 4 }}>
                    Customer: <b>{j.user.name}</b> · {j.user.phone} · Booked {fmtDate(j.createdAt)}
                  </div>
                </div>

                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <ContactButtons
                    phone={j.user.phone}
                    email={j.user.email}
                    subject={`Service Request ${j.code}`}
                    text={`Hello ${j.user.name}, this is ZZZ AUTO REPAIR regarding your vehicle ${j.vehicle.make} ${j.vehicle.model} (${j.vehicle.regNo}).`}
                  />
                  <Link href={`/owner/jobs/${j.id}`} className="btn btn-dark btn-sm">
                    Open Job Portal →
                  </Link>
                </div>
              </div>

              {/* Customer Request Statement */}
              <div
                style={{
                  background: "var(--cream)",
                  padding: "10px 14px",
                  borderRadius: 10,
                  marginBottom: 12,
                  fontSize: "0.93rem",
                }}
              >
                <span className="tiny muted uppercase" style={{ fontWeight: 700, letterSpacing: "0.05em" }}>
                  Customer Request:
                </span>
                <div style={{ marginTop: 2 }}>“{j.query}”</div>
              </div>

              {/* Bottom Action Row */}
              <div className="row between" style={{ alignItems: "center", gap: 14, flexWrap: "wrap", paddingTop: 4 }}>
                {/* Financial Summary */}
                <div className="row" style={{ gap: 16, alignItems: "center" }}>
                  {isPaid ? (
                    <div>
                      <span className="tiny muted uppercase" style={{ fontWeight: 700 }}>Settled Bill:</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ok)" }}>
                        ✓ Paid {money(paidBill.total)}
                      </div>
                    </div>
                  ) : isRequested ? (
                    <div>
                      <span className="tiny muted uppercase" style={{ fontWeight: 700 }}>Starting Estimate:</span>
                      <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                        {j.estMin > 0 ? (
                          <span style={{ color: "var(--accent)" }}>
                            {money(j.estMin)}{j.estMin !== j.estMax ? ` – ${money(j.estMax)}` : ""}
                          </span>
                        ) : (
                          <span className="badge" style={{ background: "#fee2e2", color: "#b91c1c", fontWeight: 700, padding: "3px 8px" }}>
                            ⚠️ Manual Quote Needed
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="tiny muted uppercase" style={{ fontWeight: 700 }}>Logged Charges:</span>
                      <div className="mono" style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--ink)" }}>
                        {money(subtotal)}{" "}
                        <span className="tiny muted" style={{ fontWeight: 400 }}>
                          ({(j.items || []).length} items)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Specific Actions based on whether requested, accepted, or paid */}
                <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {isPaid ? (
                    <Link href={`/owner/bills/${paidBill.id}`} className="btn btn-ghost btn-sm">
                      View Paid Bill →
                    </Link>
                  ) : isRequested ? (
                    <>
                      {/* One-click Accept & Start Repair */}
                      <form action={acceptJobRequest}>
                        <input type="hidden" name="jobId" value={j.id} />
                        <button className="btn btn-ghost btn-sm" style={{ fontWeight: 600 }}>
                          Accept Vehicle 🔧
                        </button>
                      </form>

                      {/* Quick Send Estimate Form (manual owner quote) */}
                      <form action={sendJobEstimate} className="row" style={{ gap: 6, alignItems: "center" }}>
                        <input type="hidden" name="jobId" value={j.id} />
                        <input
                          type="number"
                          name="estMin"
                          defaultValue={j.estMin > 0 ? j.estMin : ""}
                          placeholder="Min $"
                          style={{ width: 85, padding: "6px 8px", fontSize: "0.85rem", border: j.estMin === 0 ? "1.5px solid var(--accent)" : "1px solid var(--line)" }}
                          title="Minimum estimate"
                          required
                        />
                        <input
                          type="number"
                          name="estMax"
                          defaultValue={j.estMax > 0 ? j.estMax : ""}
                          placeholder="Max $"
                          style={{ width: 85, padding: "6px 8px", fontSize: "0.85rem" }}
                          title="Maximum estimate"
                        />
                        <button
                          className={`btn btn-sm ${j.estMin === 0 ? "btn-primary" : "btn-dark"}`}
                          title="Send manual price estimate to customer"
                        >
                          {j.estMin === 0 ? "Quote Price 🔔" : "Update Est 🔔"}
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      <Link href={`/owner/jobs/${j.id}`} className="btn btn-ghost btn-sm">
                        + Add Fault / Washing Charge
                      </Link>
                      <Link href={`/owner/bills/new?jobId=${j.id}`} className="btn btn-primary btn-sm">
                        Generate Final Bill →
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
