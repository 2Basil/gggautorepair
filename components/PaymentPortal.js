"use client";

import { useState, useTransition } from "react";
import { money } from "@/lib/format";
import { GARAGE } from "@/lib/config";
import { submitPaymentProof, createStripeCheckout } from "@/app/actions";

const METHOD_ICONS = {
  CARD: "💳",
  ZELLE: "⚡",
  PAYPAL: "🅿️",
  VENMO: "🅿️",
  CASHAPP: "🟢",
  APPLE_PAY: "🍎",
  BANK: "🏦",
  CASH: "💵",
  CUSTOM: "🪙",
};

// Client-side helper to format card number (kept for reference only)
// Card input is now handled entirely by Stripe Checkout — no card data enters this app.

export default function PaymentPortal({
  billId,
  billNumber,
  total,
  paymentMethods = [],
  notes = "",
  onSubmissionSuccess,
}) {
  const activeMethods = Array.isArray(paymentMethods)
    ? paymentMethods.filter((m) => m.active !== false)
    : [];

  // Parse if bill has a pending verification submission
  const isInitiallyPending = notes && notes.includes("[PAYMENT_SUBMITTED]");
  const submissionMatch = isInitiallyPending ? notes.match(/\[PAYMENT_SUBMITTED\] ([^\n]+)/) : null;
  const initialSubmissionText = submissionMatch ? submissionMatch[1] : "";

  const [selectedId, setSelectedId] = useState(activeMethods[0]?.id || "");
  const [copiedKey, setCopiedKey] = useState("");
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState(
    isInitiallyPending ? { text: initialSubmissionText } : null
  );

  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  // Form states for non-card payment proof submission (Zelle, PayPal, Cash, etc.)
  const [txnRef, setTxnRef] = useState("");
  const [payerName, setPayerName] = useState("");
  const [userNote, setUserNote] = useState("");

  const currentMethod = activeMethods.find((m) => m.id === selectedId) || activeMethods[0];

  function copyToClipboard(text, key) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 2200);
    }
  }

  // Handle payment proof submission
  function handleSubmitProof(e) {
    if (e) e.preventDefault();
    setError("");

    if (!currentMethod) {
      setError("Please select a payment method.");
      return;
    }

    let payload = {
      gateway: currentMethod.badge || currentMethod.title,
      method: currentMethod.title,
      payerName: payerName.trim(),
      notes: userNote.trim(),
    };

    // CARD type is handled by Stripe Checkout redirect — should not reach here
    if (currentMethod.type === "CARD") {
      setError("Please use the Stripe Checkout button above to pay by card.");
      return;
    } else if (currentMethod.type === "CASH") {
      payload.txnRef = txnRef.trim() || `COUNTER-CASH-${billNumber}`;
      payload.notes = userNote.trim() || "In-person cash settlement at garage counter";
    } else {
      if (!txnRef.trim()) {
        setError(
          `Please enter your transaction reference or ${
            currentMethod.type === "ZELLE"
              ? "Zelle sender name / confirmation ID"
              : currentMethod.type === "PAYPAL"
              ? "PayPal transaction ID or handle"
              : currentMethod.type === "CASHAPP"
              ? "Cash App $cashtag / reference"
              : "payment confirmation reference"
          }.`
        );
        return;
      }
      payload.txnRef = txnRef.trim();
    }

    startTransition(async () => {
      try {
        const res = await submitPaymentProof(billId, payload);
        if (res.error) {
          setError(res.error);
          return;
        }
        setSubmittedInfo({
          text: `$${total} via ${payload.gateway} · Ref: ${payload.txnRef}`,
          txnRef: payload.txnRef,
          method: payload.method,
          submittedAt: res.submittedAt,
        });
        setIsResubmitting(false);
        if (onSubmissionSuccess) onSubmissionSuccess(res);
      } catch (err) {
        setError("Failed to submit payment verification. Please try again.");
      }
    });
  }

  // Handle live Stripe redirect if applicable
  function handleLiveStripeCheckout() {
    startTransition(async () => {
      setError("");
      const res = await createStripeCheckout(billId);
      if (res.url) {
        window.location.href = res.url;
      } else if (res.noStripe) {
        setError("Card payments via Stripe are not configured yet. Please use another payment method below, or contact the garage.");
      } else if (res.error) {
        setError(res.error);
      }
    });
  }

  // Deep link builder
  function getAppDeepLink(method) {
    const amountDollars = (total / 100).toFixed(2);
    if (method.type === "PAYPAL" && method.details) {
      const handle = method.details.replace(/^@/, "").replace(/paypal\.me\//i, "");
      return `https://www.paypal.com/paypalme/${handle}/${amountDollars}`;
    }
    if (method.type === "CASHAPP" && method.details) {
      const tag = method.details.startsWith("$") ? method.details : `$${method.details}`;
      return `https://cash.app/${tag}/${amountDollars}`;
    }
    if (method.type === "ZELLE") {
      return "https://enroll.zellepay.com/";
    }
    return null;
  }

  // =========================================================================
  // STATE 1: OWNER HAS NOT CONFIGURED PAYMENT METHODS YET
  // =========================================================================
  if (activeMethods.length === 0) {
    return (
      <div
        id="payment"
        style={{
          background: "#ffffff",
          borderRadius: 20,
          border: "2px solid #e2e8f0",
          padding: "26px 28px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: "1.8rem" }}>⏳</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.18rem", color: "#0f172a", fontWeight: 800 }}>
              Payment Information in Setup
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.86rem", color: "#64748b" }}>
              The garage owner has not published online payment receiving accounts for this invoice yet.
            </p>
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1.5px dashed #cbd5e1",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#334155", marginBottom: 6 }}>
            💵 In-Person Counter Settlement
          </div>
          <div style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5 }}>
            You can pay the outstanding balance of <b>{money(total)}</b> in person using cash, debit
            card swipe, or check at the garage counter upon vehicle pick-up.
          </div>
        </div>

        {/* Garage Contact Details */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            fontSize: "0.83rem",
            color: "#475569",
            background: "#f1f5f9",
            padding: "14px 18px",
            borderRadius: 12,
          }}
        >
          <div>
            <span style={{ fontWeight: 700, color: "#1e293b" }}>📍 Service Location:</span>
            <div style={{ marginTop: 2 }}>{GARAGE.address}</div>
          </div>
          <div>
            <span style={{ fontWeight: 700, color: "#1e293b" }}>📞 Phone:</span>
            <div style={{ marginTop: 2 }}>{GARAGE.phone}</div>
          </div>
          <div>
            <span style={{ fontWeight: 700, color: "#1e293b" }}>✉️ Email:</span>
            <div style={{ marginTop: 2 }}>{GARAGE.email}</div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 2: PAYMENT SUBMITTED — AWAITING GARAGE VERIFICATION
  // =========================================================================
  if (submittedInfo && !isResubmitting) {
    return (
      <div
        id="payment"
        style={{
          background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
          borderRadius: 20,
          border: "2px solid #f59e0b",
          padding: "24px 28px",
          boxShadow: "0 8px 30px rgba(245, 158, 11, 0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <span style={{ fontSize: "2rem" }}>⏳</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "1.18rem", color: "#92400e", fontWeight: 900 }}>
                Payment Submitted — Awaiting Garage Verification
              </h3>
              <span
                style={{
                  background: "#fde68a",
                  color: "#78350f",
                  padding: "3px 10px",
                  borderRadius: 12,
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                }}
              >
                VERIFICATION PENDING
              </span>
            </div>

            <p style={{ margin: "6px 0 12px", fontSize: "0.86rem", color: "#78350f", lineHeight: 1.5 }}>
              Your payment reference has been recorded and submitted to the garage owner. Once the garage
              verifies the deposit in their account, your invoice will be confirmed as <b>PAID IN FULL</b>.
            </p>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #fde68a",
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: "0.84rem",
                color: "#1f2937",
                display: "grid",
                gap: 4,
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: "#92400e" }}>Amount Due:</span>{" "}
                <b>{money(total)}</b>
              </div>
              <div>
                <span style={{ fontWeight: 700, color: "#92400e" }}>Submission Details:</span>{" "}
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.82rem" }}>
                  {submittedInfo.text}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setIsResubmitting(true)}
                className="btn btn-ghost btn-sm"
                style={{ borderColor: "#d97706", color: "#92400e", fontSize: "0.78rem" }}
              >
                ✏️ Update Reference / Resubmit
              </button>
              <span style={{ fontSize: "0.75rem", color: "#b45309" }}>
                Need urgent clearance? Call the garage at {GARAGE.phone}.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 3: REDESIGNED MODERN PAYMENT PORTAL & AVAILABLE DETAILS
  // =========================================================================
  const deepLink = currentMethod ? getAppDeepLink(currentMethod) : null;

  return (
    <div
      id="payment"
      style={{
        background: "#ffffff",
        borderRadius: 22,
        border: "1.5px solid #e2e8f0",
        padding: "26px 28px",
        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.08)",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 14,
          paddingBottom: 20,
          borderBottom: "1.5px solid #f1f5f9",
          marginBottom: 22,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.45rem" }}>💳</span>
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a", fontWeight: 900 }}>
              Garage Payment Portal
            </h3>
            <span
              style={{
                background: "#ecfdf5",
                color: "#059669",
                border: "1px solid #a7f3d0",
                padding: "2px 10px",
                borderRadius: 20,
                fontSize: "0.7rem",
                fontWeight: 800,
              }}
            >
              🔒 256-BIT ENCRYPTED
            </span>
          </div>
          <p style={{ margin: "5px 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Select an available payment method configured by the garage owner below to settle your invoice.
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.06em" }}>
            Amount Payable
          </div>
          <div
            style={{
              fontSize: "1.85rem",
              fontWeight: 900,
              color: "#0f172a",
              fontFamily: "var(--mono)",
              lineHeight: 1.1,
            }}
          >
            {money(total)}
          </div>
          <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: 2 }}>
            Invoice #{billNumber}
          </div>
        </div>
      </div>

      {/* ── Payment Methods Selector Grid ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Available Payment Options ({activeMethods.length})
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          {activeMethods.map((m) => {
            const isSelected = selectedId === m.id;
            const icon = METHOD_ICONS[m.type] || "💳";
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedId(m.id);
                  setError("");
                }}
                disabled={busy}
                style={{
                  cursor: busy ? "not-allowed" : "pointer",
                  padding: "13px 15px",
                  borderRadius: 14,
                  border: isSelected ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                  background: isSelected
                    ? "linear-gradient(135deg, #ffffff, #eff6ff)"
                    : "#f8fafc",
                  boxShadow: isSelected ? "0 4px 16px rgba(37, 99, 235, 0.16)" : "none",
                  transition: "all 0.18s ease",
                  textAlign: "left",
                  position: "relative",
                  outline: "none",
                }}
              >
                {isSelected && (
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#2563eb",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.68rem",
                      fontWeight: 900,
                    }}
                  >
                    ✓
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: "1.25rem" }}>{icon}</span>
                  <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>
                    {m.title}
                  </span>
                </div>
                {m.badge && (
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 6,
                      background: isSelected ? "#dbeafe" : "#e2e8f0",
                      color: isSelected ? "#1d4ed8" : "#475569",
                      display: "inline-block",
                      marginTop: 2,
                    }}
                  >
                    {m.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Method Details & Instructions Card ── */}
      {currentMethod && (
        <div
          style={{
            background: "#f8fafc",
            borderRadius: 16,
            border: "1.5px solid #e2e8f0",
            padding: "20px 22px",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: "1.5rem" }}>{METHOD_ICONS[currentMethod.type] || "💳"}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.02rem", color: "#0f172a" }}>
                {currentMethod.title}
              </div>
              {currentMethod.accountName && (
                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  Beneficiary: <b>{currentMethod.accountName}</b>
                </div>
              )}
            </div>
            <span
              style={{
                marginLeft: "auto",
                background: "#dcfce7",
                color: "#15803d",
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: "0.72rem",
                fontWeight: 700,
              }}
            >
              ✓ Owner Configured
            </span>
          </div>

          {/* Receiving Details with Copy Action */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>
                {currentMethod.type === "BANK"
                  ? "Routing & Account Details"
                  : currentMethod.type === "ZELLE"
                  ? "Zelle Recipient Address / Phone"
                  : currentMethod.type === "CASHAPP"
                  ? "$Cashtag Identifier"
                  : currentMethod.type === "CASH"
                  ? "Counter Location"
                  : "Receiving Details"}
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", fontFamily: "var(--mono)" }}>
                {currentMethod.details}
              </div>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(currentMethod.details, "details")}
              className="btn btn-ghost btn-sm"
              style={{
                borderColor: copiedKey === "details" ? "#16a34a" : "#cbd5e1",
                color: copiedKey === "details" ? "#16a34a" : "#334155",
                gap: 6,
                fontSize: "0.78rem",
              }}
            >
              {copiedKey === "details" ? "✓ Copied to Clipboard!" : "📋 Copy Details"}
            </button>
          </div>

          {/* Invoice Memo to Include */}
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: "0.82rem", color: "#1e40af" }}>
              <b>Required Memo / Note:</b> <span style={{ fontFamily: "var(--mono)", fontWeight: 800 }}>Invoice #{billNumber}</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(`Invoice #${billNumber}`, "memo")}
              className="btn btn-ghost btn-sm"
              style={{
                fontSize: "0.74rem",
                padding: "3px 8px",
                borderColor: copiedKey === "memo" ? "#16a34a" : "#93c5fd",
                color: copiedKey === "memo" ? "#16a34a" : "#1d4ed8",
              }}
            >
              {copiedKey === "memo" ? "✓ Copied!" : "Copy Memo"}
            </button>
          </div>

          {/* Instructions */}
          {currentMethod.instructions && (
            <div style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.4 }}>
              ℹ️ <b>Instructions:</b> {currentMethod.instructions}
            </div>
          )}

          {/* Optional App Launch Button */}
          {deepLink && (
            <div style={{ marginTop: 14 }}>
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: 10,
                  background:
                    currentMethod.type === "PAYPAL"
                      ? "#0070ba"
                      : currentMethod.type === "CASHAPP"
                      ? "#00c244"
                      : "#7c3aed",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                <span>{METHOD_ICONS[currentMethod.type]}</span>
                Open {currentMethod.title} App / Site
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── CARD TYPE: Redirect to Stripe Checkout ── */}
      {currentMethod?.type === "CARD" && (
        <div
          style={{
            background: "linear-gradient(135deg, #f8faff, #eff6ff)",
            border: "1.5px solid #bfdbfe",
            borderRadius: 16,
            padding: "22px 24px",
            marginBottom: 20,
          }}
        >
          {/* Security Banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 18,
            }}
          >
            <span style={{ fontSize: "1.3rem" }}>🛡️</span>
            <div>
              <div style={{ fontSize: "0.84rem", fontWeight: 800, color: "#166534" }}>
                Stripe-Hosted Secure Checkout
              </div>
              <div style={{ fontSize: "0.76rem", color: "#15803d", marginTop: 2 }}>
                You will be redirected to Stripe&apos;s PCI-DSS Level 1 certified payment page.
                Card details are entered directly on Stripe — your card number is <b>never seen or stored</b> by this site.
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
              {["Visa", "Mastercard", "Amex", "Discover"].map((c) => (
                <span
                  key={c}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#374151",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: "0.83rem", color: "#475569", lineHeight: 1.5 }}>
              Click below to securely pay <b style={{ color: "#1e40af" }}>{money(total)}</b> via Stripe.
              You&apos;ll be taken to Stripe&apos;s secure checkout and returned here automatically on completion.
            </p>
          </div>

          {error && (
            <div style={{ color: "#dc2626", fontSize: "0.84rem", fontWeight: 600, marginBottom: 14 }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleLiveStripeCheckout}
            disabled={busy}
            style={{
              width: "100%",
              padding: "15px 20px",
              background: busy ? "#94a3b8" : "linear-gradient(135deg, #635bff, #7c3aed)",
              color: "#ffffff",
              border: "none",
              borderRadius: 12,
              fontWeight: 900,
              fontSize: "1rem",
              cursor: busy ? "not-allowed" : "pointer",
              boxShadow: "0 4px 18px rgba(99, 91, 255, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            {busy ? (
              "Redirecting to Stripe…"
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 60 60" fill="none">
                  <rect width="60" height="60" rx="10" fill="white" fillOpacity="0.15"/>
                  <path d="M27.5 20c-5.5 0-9 2.7-9 7 0 9.4 12.5 6.9 12.5 11.3 0 1.7-1.5 2.7-4 2.7-3.5 0-6.2-1.4-7.5-2.2V44c1.5.7 4 1.5 7.5 1.5 5.8 0 9.5-2.8 9.5-7.3 0-9.6-12.7-7-12.7-11.2 0-1.5 1.3-2.5 3.7-2.5 3 0 5.5 1.2 6.5 1.8V21c-1-.5-3.2-1-6.5-1z" fill="white"/>
                </svg>
                Pay {money(total)} with Stripe
              </>
            )}
          </button>

          <p style={{ margin: "12px 0 0", fontSize: "0.73rem", color: "#94a3b8", textAlign: "center" }}>
            🔒 Secured by Stripe · You&apos;ll be redirected and returned automatically
          </p>
        </div>
      )}

      {/* ── NON-CARD REFERENCE SUBMISSION FORM ── */}
      {currentMethod?.type !== "CARD" && (
        <form onSubmit={handleSubmitProof} style={{ display: "grid", gap: 14 }}>
          <div>
            <label
              style={{
                fontSize: "0.84rem",
                fontWeight: 800,
                color: "#1e293b",
                display: "block",
                marginBottom: 6,
              }}
            >
              {currentMethod.type === "CASH"
                ? "Counter Arrival / Settlement Note"
                : currentMethod.type === "ZELLE"
                ? "Enter Zelle Sender Name or Confirmation Ref *"
                : currentMethod.type === "PAYPAL"
                ? "Enter PayPal Transaction ID or Handle *"
                : currentMethod.type === "CASHAPP"
                ? "Enter $Cashtag or Cash App Receipt Number *"
                : "Enter Transaction ID or Payment Reference *"}
            </label>
            <input
              type="text"
              placeholder={
                currentMethod.type === "CASH"
                  ? "e.g. Will pay cash at counter on vehicle pick-up"
                  : currentMethod.type === "ZELLE"
                  ? "e.g. John Doe (Chase Zelle) or #ZL-987654"
                  : currentMethod.type === "CASHAPP"
                  ? "e.g. $john_customer or #CA-123456"
                  : "e.g. TXN-8921829 or sender handle"
              }
              value={txnRef}
              onChange={(e) => setTxnRef(e.target.value)}
              disabled={busy}
              style={{
                width: "100%",
                maxWidth: 480,
                padding: "11px 14px",
                borderRadius: 10,
                border: "1.5px solid #cbd5e1",
                fontSize: "0.9rem",
                background: "#f8fafc",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 4 }}>
              * Submitted to garage owner to cross-reference and verify incoming funds.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 480 }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                Sender / Payer Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Your name or account name"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                disabled={busy}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  background: "#f8fafc",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                Additional Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Paid from mobile app"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                disabled={busy}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  background: "#f8fafc",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {error && (
            <div style={{ color: "#dc2626", fontSize: "0.84rem", fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={busy}
              style={{
                padding: "14px 24px",
                background: busy ? "#94a3b8" : "linear-gradient(135deg, #1d4ed8, #2563eb)",
                color: "#ffffff",
                border: "none",
                borderRadius: 12,
                fontWeight: 900,
                fontSize: "1rem",
                cursor: busy ? "not-allowed" : "pointer",
                boxShadow: "0 4px 18px rgba(37, 99, 235, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {busy ? "Submitting for Verification…" : `Submit Payment for Garage Verification`}
            </button>
          </div>
        </form>
      )}

      {/* ── Security Trust Badges ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 20,
          paddingTop: 16,
          borderTop: "1px solid #f1f5f9",
          flexWrap: "wrap",
          gap: 10,
          fontSize: "0.72rem",
          color: "#64748b",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span>🔒 Zero Card Data Storage</span>
          <span>•</span>
          <span>Stripe-Hosted Checkout</span>
          <span>•</span>
          <span>Garage Owner Verification Required</span>
        </div>
        <div>All transactions reconciled securely</div>
      </div>
    </div>
  );
}
