"use client";

import { GARAGE } from "@/lib/config";
import { fmtDateTime, money, prettyReg } from "@/lib/format";
import PrintButton from "./PrintButton";
import { useState } from "react";
import { usePathname } from "next/navigation";
import PaymentPortal from "./PaymentPortal";

export default function BillView({
  bill: initialBill,
  showPrices = true,
  paymentStatus,
  allowOnlinePayment,
  paymentMethods = [],
}) {
  const pathname = usePathname();
  const isOwnerPortal = pathname ? pathname.startsWith("/owner") : false;
  const canShowOnlinePayment = allowOnlinePayment !== undefined ? allowOnlinePayment : !isOwnerPortal;

  const [bill, setBill] = useState(initialBill);
  const [settledInfo, setSettledInfo] = useState(null);

  function handleSuccess(res) {
    // Do NOT mark bill as paid here — submission is pending garage verification.
    // Only a Stripe webhook or owner manual confirmation sets paid=true.
    setBill((prev) => ({
      ...prev,
      // Reflect the pending state in the notes so the UI shows the "awaiting verification" banner
      notes: prev.notes
        ? `${prev.notes}\n[PAYMENT_SUBMITTED] $${res.amount} via ${res.method} · Ref: ${res.txnRef}`
        : `[PAYMENT_SUBMITTED] $${res.amount} via ${res.method} · Ref: ${res.txnRef}`,
    }));
    setSettledInfo(res);
  }

  const isPaid = bill.paid;
  const isPending = !isPaid && bill.notes && bill.notes.includes("[PAYMENT_SUBMITTED]");

  return (
    <div className="receipt-wrapper">
      {/* Quick Payment Banner above receipt */}
      {!isPaid && canShowOnlinePayment && (
        <div
          className="no-print"
          style={{
            background: isPending
              ? "linear-gradient(135deg, #fffbeb, #fef3c7)"
              : "linear-gradient(135deg, #eff6ff, #dbeafe)",
            border: `1.5px solid ${isPending ? "#f59e0b" : "#93c5fd"}`,
            borderRadius: 16,
            padding: "14px 20px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem" }}>{isPending ? "⏳" : "💳"}</span>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  color: isPending ? "#92400e" : "#1e3a8a",
                }}
              >
                {isPending
                  ? "Payment Submitted — Garage Verification in Progress"
                  : `Invoice Due: ${money(bill.total)}`}
              </div>
              <div style={{ fontSize: "0.78rem", color: isPending ? "#b45309" : "#1d4ed8" }}>
                {isPending
                  ? "Reference submitted. The garage will verify the deposit and confirm your receipt."
                  : "View available payment methods configured by garage owner below."}
              </div>
            </div>
          </div>

          <a
            href="#payment"
            style={{
              background: isPending ? "#d97706" : "#2563eb",
              color: "#ffffff",
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: "0.85rem",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            {isPending ? "View Submitted Details ↓" : "Pay Bill Online ↓"}
          </a>
        </div>
      )}

      {/* Payment success banner */}
      {(paymentStatus === "success" || settledInfo) && (
        <div style={{
          background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
          border: "2px solid #34d399",
          borderRadius: 16, padding: "18px 24px", marginBottom: 20,
          display: "flex", gap: 14, alignItems: "center",
          boxShadow: "0 6px 20px rgba(16, 185, 129, 0.18)",
        }}>
          <span style={{ fontSize: "2rem" }}>✅</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#065f46" }}>
              Payment Verified &amp; Settled!
            </div>
            <div style={{ fontSize: "0.86rem", color: "#047857", marginTop: 2 }}>
              Your bill has been marked <b>PAID IN FULL</b>.
              {settledInfo?.txnRef && ` Authorization Ref: ${settledInfo.txnRef}.`}
              The garage records have been automatically updated.
            </div>
          </div>
          <span style={{
            background: "#059669", color: "#fff", padding: "6px 14px",
            borderRadius: 8, fontWeight: 800, fontSize: "0.8rem",
          }}>
            SETTLED
          </span>
        </div>
      )}

      {paymentStatus === "cancelled" && (
        <div style={{
          background: "#fff7ed", border: "1px solid #fed7aa",
          borderRadius: 14, padding: "16px 20px", marginBottom: 20,
          display: "flex", gap: 12, alignItems: "center",
        }}>
          <span style={{ fontSize: "1.8rem" }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: "#9a3412" }}>Payment Cancelled</div>
            <div style={{ fontSize: "0.85rem", color: "#c2410c" }}>
              Your checkout was cancelled. You can retry with any gateway below.
            </div>
          </div>
        </div>
      )}

      <div className="receipt-paper">
        {/* Receipt Stamp: PAID, PENDING, or DUE */}
        {isPaid ? (
          <div className="receipt-stamp-paid">PAID IN FULL</div>
        ) : isPending ? (
          <div
            className="receipt-stamp-due"
            style={{
              borderColor: "#f59e0b",
              color: "#d97706",
              background: "rgba(254, 243, 199, 0.35)",
            }}
          >
            VERIFICATION PENDING
          </div>
        ) : (
          <div className="receipt-stamp-due">PAY AT COUNTER</div>
        )}

        {/* Store Header */}
        <div className="receipt-header">
          <div style={{ fontSize: "0.75rem", letterSpacing: "0.18em", color: "#6b7280", textTransform: "uppercase", marginBottom: 3 }}>
            ★ RETAIL SERVICE SLIP ★
          </div>
          <h1 className="receipt-store-title">{GARAGE.name}</h1>
          <div className="receipt-store-sub">Official Tax Invoice &amp; Cash Memo</div>
          <div className="receipt-store-meta">
            <div>{GARAGE.address}</div>
            <div>Tel: {GARAGE.phone} · {GARAGE.email}</div>
            {GARAGE.gstin && <div>GSTIN / Tax ID: <b>{GARAGE.gstin}</b></div>}
          </div>
        </div>

        <hr className="receipt-divider" />

        {/* Receipt Meta Key-Values */}
        <div style={{ display: "grid", gap: "2px" }}>
          <div className="receipt-kv">
            <span>INVOICE SERIAL NO:</span>
            <b style={{ letterSpacing: "0.06em", fontSize: "0.92rem", color: "#111827" }}>{bill.number}</b>
          </div>
          <div className="receipt-kv">
            <span>DATE &amp; TIME:</span>
            <span>{fmtDateTime(bill.createdAt)}</span>
          </div>
          <div className="receipt-kv">
            <span>TERMINAL / COUNTER:</span>
            <span>Counter 01 · Service Bay</span>
          </div>
          <div className="receipt-kv">
            <span>PAYMENT STATUS:</span>
            <b
              style={{
                color: isPaid ? "#16a34a" : isPending ? "#d97706" : "#dc2626",
                fontWeight: 800,
              }}
            >
              {isPaid ? "PAID IN FULL" : isPending ? "VERIFICATION PENDING" : "DUE AT GARAGE"}
            </b>
          </div>
          <div className="receipt-kv">
            <span>BILLED TO:</span>
            <b style={{ color: "#111827" }}>{bill.user.name}</b>
          </div>
          <div className="receipt-kv">
            <span>PHONE / CONTACT:</span>
            <span>{bill.user.phone || "—"}</span>
          </div>
          <div className="receipt-kv">
            <span>VEHICLE:</span>
            <b>{bill.vehicle.make} {bill.vehicle.model} ({bill.vehicle.year})</b>
          </div>
          <div className="receipt-kv">
            <span>VEHICLE REG NO:</span>
            <span style={{ fontWeight: 800, letterSpacing: "0.05em", color: "#111827" }}>
              {prettyReg(bill.vehicle.regNo)}
            </span>
          </div>
          {bill.job && (
            <div className="receipt-kv">
              <span>JOB ORDER REF:</span>
              <span>#{bill.job.code}</span>
            </div>
          )}
        </div>

        <hr className="receipt-divider" />

        {/* Table Columns Header */}
        <div className="receipt-table-header">
          <span style={{ flex: 2.2 }}>ITEM / SERVICE</span>
          <span style={{ flex: 0.6, textAlign: "center" }}>QTY</span>
          {showPrices && <span style={{ flex: 1, textAlign: "right" }}>RATE</span>}
          {showPrices && <span style={{ flex: 1.2, textAlign: "right" }}>AMOUNT</span>}
        </div>
        <hr className="receipt-divider" style={{ margin: "4px 0 6px" }} />

        {/* Item Rows */}
        <div>
          {bill.items.map((i, k) => (
            <div key={i.id || k} className="receipt-item-row">
              <div style={{ flex: 2.2, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#111827", lineHeight: 1.25 }}>{i.description}</div>
                {i.category && (
                  <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 2 }}>{i.category}</div>
                )}
              </div>
              <div style={{ flex: 0.6, textAlign: "center", color: "#374151", fontWeight: 500 }}>
                {i.qty}
              </div>
              {showPrices && (
                <div style={{ flex: 1, textAlign: "right", fontFamily: "var(--mono)", fontSize: "0.82rem", color: "#4b5563" }}>
                  {money(i.unitPrice)}
                </div>
              )}
              {showPrices && (
                <div style={{ flex: 1.2, textAlign: "right", fontFamily: "var(--mono)", fontWeight: 700, color: "#111827" }}>
                  {money(i.qty * i.unitPrice)}
                </div>
              )}
            </div>
          ))}
        </div>

        <hr className="receipt-divider" />

        {/* Totals Section */}
        {showPrices && (
          <div>
            <div className="receipt-kv">
              <span>SUBTOTAL ({bill.items.length} {bill.items.length === 1 ? "item" : "items"}):</span>
              <span style={{ fontFamily: "var(--mono)" }}>{money(bill.subtotal)}</span>
            </div>
            {bill.discount > 0 && (
              <div className="receipt-kv" style={{ color: "#16a34a", fontWeight: 600 }}>
                <span>DISCOUNT APPLIED:</span>
                <span style={{ fontFamily: "var(--mono)" }}>− {money(bill.discount)}</span>
              </div>
            )}
            <div className="receipt-kv">
              <span>TAX / GST ({bill.taxPct}%):</span>
              <span style={{ fontFamily: "var(--mono)" }}>{money(bill.tax)}</span>
            </div>

            <hr className="receipt-divider-double" />

            <div className="receipt-grand-total">
              <span>NET PAYABLE</span>
              <span>{money(bill.total)}</span>
            </div>

            <hr className="receipt-divider-double" />
          </div>
        )}

        {/* Verified Payment Seal if Paid */}
        {isPaid && (
          <div style={{
            margin: "14px 0",
            padding: "12px 14px",
            background: "#ecfdf5",
            border: "1.5px solid #6ee7b7",
            borderRadius: 8,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: "0.84rem", color: "#065f46" }}>
                ✓ OFFICIAL PAYMENT VERIFICATION SEAL
              </span>
              <span style={{ fontSize: "0.72rem", background: "#059669", color: "#fff", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                AUTHENTICATED
              </span>
            </div>
            <div style={{ fontSize: "0.76rem", color: "#047857", marginTop: 4 }}>
              Status: <b>PAID IN FULL</b> · Net Cleared: <b>{money(bill.total)}</b>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#065f46", marginTop: 2, fontFamily: "var(--mono)" }}>
              {settledInfo?.txnRef ? `Auth Ref: ${settledInfo.txnRef}` : `Auth Ref: US-VERIFIED-${bill.number}`}
            </div>
          </div>
        )}

        {/* Notes / Special remarks */}
        {bill.notes && (
          <div style={{ margin: "14px 0 10px", fontSize: "0.8rem", color: "#4b5563", background: "#f9fafb", padding: "8px 12px", borderRadius: "4px", border: "1px dashed #d1d5db" }}>
            <b>Special Remarks:</b> {bill.notes}
          </div>
        )}

        {/* Barcode */}
        <div className="receipt-barcode">
          <div className="receipt-barcode-bars" />
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.82rem", letterSpacing: "0.22em", marginTop: 4, fontWeight: 700, color: "#1f2937" }}>
            *{bill.number}*
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div className="receipt-thanks">*** THANK YOU FOR VISITING ***</div>
          <div style={{ fontSize: "0.76rem", color: "#6b7280", marginTop: 4 }}>
            Please retain this receipt for vehicle warranty and service records.
          </div>
          <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: 6 }}>
            Authorized Digital Tax Invoice · Unique Serial ID: {bill.number}
          </div>
        </div>
      </div>

      {/* Online Payment Portal & Print actions */}
      <div className="no-print" style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: "14px" }}>
        <PrintButton />

        {!isPaid && showPrices && canShowOnlinePayment && (
          <PaymentPortal
            billId={bill.id}
            billNumber={bill.number}
            total={bill.total}
            paymentMethods={paymentMethods}
            notes={bill.notes}
            onSubmissionSuccess={(res) => {
              setBill((prev) => ({
                ...prev,
                notes: prev.notes
                  ? `${prev.notes}\n[PAYMENT_SUBMITTED] Ref: ${res.txnRef}`
                  : `[PAYMENT_SUBMITTED] Ref: ${res.txnRef}`,
              }));
            }}
          />
        )}
      </div>
    </div>
  );
}
