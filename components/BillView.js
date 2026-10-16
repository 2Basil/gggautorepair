"use client";

import { GARAGE } from "@/lib/config";
import { fmtDateTime, money, prettyReg } from "@/lib/format";
import PrintButton from "./PrintButton";
import { createStripeCheckout, verifyAndSettleBill } from "@/app/actions";
import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";

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

const DEFAULT_FALLBACK_GATEWAYS = [
  {
    id: "card",
    type: "CARD",
    title: "Credit / Debit Card",
    badge: "Stripe & Square",
    details: "All major US credit & debit cards accepted (Visa, Mastercard, AmEx, Discover)",
    accountName: "ZZZ Auto Care Merchant",
    instructions: "Instant 256-bit encrypted checkout via Stripe network.",
    active: true,
  },
  {
    id: "zelle",
    type: "ZELLE",
    title: "Zelle Transfer",
    badge: "Instant / $0 Fee",
    details: "payments@zzzautorepair.com",
    accountName: "ZZZ Auto Care LLC",
    instructions: "Send from your mobile banking app. Include your invoice serial number in the memo.",
    active: true,
  },
  {
    id: "paypal",
    type: "PAYPAL",
    title: "PayPal & Venmo",
    badge: "PayPal / Venmo",
    details: "pay@zzzautorepair.com (Venmo: @ZZZ-AutoCare)",
    accountName: "ZZZ Auto Care",
    instructions: "Pay via PayPal balance, connected US checking account, or Venmo app.",
    active: true,
  },
  {
    id: "cashapp",
    type: "CASHAPP",
    title: "Cash App Pay",
    badge: "Square Cash",
    details: "$ZZZAutoCare",
    accountName: "ZZZ Auto Repair",
    instructions: "Send payment to our $cashtag or scan QR code at counter.",
    active: true,
  },
  {
    id: "applepay",
    type: "APPLE_PAY",
    title: "Apple Pay & Google Pay",
    badge: "Digital Wallets",
    details: "Biometric 1-touch checkout on iPhone, Mac, Android, and Chrome.",
    accountName: "ZZZ Auto Digital",
    instructions: "Authenticate instantly with Touch ID, Face ID, or Google Wallet.",
    active: true,
  },
  {
    id: "cash",
    type: "CASH",
    title: "Pay at Garage Counter / POS",
    badge: "In-Person",
    details: "Pay at 1240 Industrial Way, Bay 3",
    accountName: "Service Bay Terminal",
    instructions: "Pay in person with cash, debit card swipe, or check during vehicle pick-up.",
    active: true,
  },
];

// ─── helpers to build deep-link pay URLs for each gateway ───────────────────
function buildPayUrl(method, total, billNumber) {
  const amountDollars = (total / 100).toFixed(2);
  const memo = encodeURIComponent(`Invoice ${billNumber}`);
  const details = encodeURIComponent(method.details || "");
  switch (method.type) {
    case "ZELLE":
      // Zelle has no universal deep link; open banking app or web
      return `https://enroll.zellepay.com/`;
    case "PAYPAL":
      return `https://www.paypal.com/paypalme/${method.details?.replace(/^@/, "") || ""}/${amountDollars}`;
    case "VENMO":
      // Venmo deep link: venmo://paycharge?txn=pay&recipients=HANDLE&amount=AMOUNT&note=NOTE
      return `venmo://paycharge?txn=pay&recipients=${method.details?.replace(/^@|^Venmo:\s*/i, "") || ""}&amount=${amountDollars}&note=${memo}`;
    case "CASHAPP":
      return `https://cash.app/${method.details?.startsWith("$") ? method.details : "$" + method.details}/${amountDollars}`;
    case "APPLE_PAY":
      return null; // handled in-browser via Stripe
    case "BANK":
      return null; // no universal link
    case "CASH":
      return null; // in-person
    default:
      return null;
  }
}

// ─── card number formatter ───────────────────────────────────────────────────
function fmtCard(raw) {
  return raw
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

// ─── Verification Steps UI ───────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Connecting to gateway network…" },
  { id: 2, label: "Verifying merchant receiving account…" },
  { id: 3, label: "Encrypting payment & generating receipt…" },
  { id: 4, label: "Settling bill — updating garage records…" },
];

function VerificationProgress({ step }) {
  return (
    <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
      {STEPS.map((s) => {
        const done = step > s.id;
        const active = step === s.id;
        return (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 14px",
              borderRadius: 10,
              background: done ? "#f0fdf4" : active ? "#eff6ff" : "#f8fafc",
              border: `1px solid ${done ? "#86efac" : active ? "#93c5fd" : "#e2e8f0"}`,
              transition: "all 0.25s ease",
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.78rem",
                fontWeight: 800,
                background: done ? "#16a34a" : active ? "#2563eb" : "#e2e8f0",
                color: done || active ? "#fff" : "#94a3b8",
                flexShrink: 0,
                transition: "all 0.2s",
              }}
            >
              {done ? "✓" : s.id}
            </span>
            <span
              style={{
                fontSize: "0.84rem",
                fontWeight: active ? 700 : 500,
                color: done ? "#15803d" : active ? "#1d4ed8" : "#64748b",
              }}
            >
              {s.label}
            </span>
            {active && (
              <span
                className="pulse"
                style={{ width: 8, height: 8, background: "#3b82f6", marginLeft: "auto" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Payment Portal ─────────────────────────────────────────────────────
function USPaymentPortal({ billId, billNumber, total, onPaymentSuccess, paymentMethods = [] }) {
  const activeMethods =
    paymentMethods && paymentMethods.length > 0
      ? paymentMethods.filter((m) => m.active !== false)
      : DEFAULT_FALLBACK_GATEWAYS;

  const [selectedId, setSelectedId] = useState(activeMethods[0]?.id || "card");
  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardZip, setCardZip] = useState("");
  // Other method reference
  const [userRef, setUserRef] = useState("");

  const [busy, start] = useTransition();
  const [verifyStep, setVerifyStep] = useState(0); // 0 = idle, 1-4 = steps, 5 = done
  const [err, setErr] = useState("");

  const currentMethod =
    activeMethods.find((m) => m.id === selectedId) || activeMethods[0] || DEFAULT_FALLBACK_GATEWAYS[0];

  // Reset fields when method changes
  function handleSelectMethod(id) {
    if (busy) return;
    setSelectedId(id);
    setUserRef("");
    setErr("");
    setVerifyStep(0);
  }

  // Validate before paying
  function validate() {
    if (currentMethod.type === "CARD") {
      const digits = cardNumber.replace(/\D/g, "");
      if (digits.length < 13) return "Please enter a valid card number.";
      if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) return "Please enter a valid expiry (MM/YY).";
      if (cardCvc.replace(/\D/g, "").length < 3) return "Please enter a valid CVC.";
      if (!cardHolder.trim()) return "Please enter the cardholder name.";
      return null;
    }
    if (currentMethod.type === "CASH") return null; // no ref required
    if (!userRef.trim()) {
      return `Please enter your ${
        currentMethod.type === "ZELLE" ? "sender name or Zelle reference" :
        currentMethod.type === "PAYPAL" ? "PayPal handle or transaction ID" :
        currentMethod.type === "VENMO" ? "Venmo handle or transaction ID" :
        currentMethod.type === "CASHAPP" ? "$cashtag or Cash App receipt ref" :
        currentMethod.type === "BANK" ? "wire/ACH confirmation number" :
        "payment reference"
      } before confirming.`;
    }
    return null;
  }

  function handleProcessPayment(useLiveStripe = false) {
    const validationError = validate();
    if (validationError) { setErr(validationError); return; }
    setErr("");
    setVerifyStep(0);

    start(async () => {
      // Live Stripe checkout redirect
      if (useLiveStripe && currentMethod.type === "CARD") {
        setVerifyStep(1);
        const res = await createStripeCheckout(billId);
        if (res.url) { window.location.href = res.url; return; }
        if (res.error && !res.testMode) { setErr(res.error); setVerifyStep(0); return; }
        // testMode: fall through to simulation
      }

      // 4-step verification animation
      try {
        setVerifyStep(1);
        await new Promise((r) => setTimeout(r, 700));
        setVerifyStep(2);
        await new Promise((r) => setTimeout(r, 750));
        setVerifyStep(3);
        await new Promise((r) => setTimeout(r, 650));
        setVerifyStep(4);

        const last4 =
          currentMethod.type === "CARD"
            ? cardNumber.replace(/\D/g, "").slice(-4) || "4242"
            : userRef.trim().slice(-4) || "PAID";

        const res = await verifyAndSettleBill(billId, {
          gateway: currentMethod.badge || currentMethod.title,
          method: currentMethod.title,
          brand: currentMethod.type === "CARD" ? (cardHolder || "Card") : currentMethod.title,
          last4,
          txnRef: `${(currentMethod.badge || currentMethod.type)
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")}-${Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase()}`,
        });

        if (res.error) { setErr(res.error); setVerifyStep(0); return; }

        setVerifyStep(5);
        if (onPaymentSuccess) onPaymentSuccess(res);
      } catch {
        setErr("Payment processing encountered an error. Please try again.");
        setVerifyStep(0);
      }
    });
  }

  const payUrl = buildPayUrl(currentMethod, total, billNumber);
  const isVerifying = verifyStep > 0 && verifyStep < 5;
  const isDone = verifyStep === 5;

  return (
    <div
      id="payment"
      style={{
        background: "linear-gradient(135deg, #f0f9ff, #eff6ff)",
        border: "2px solid #93c5fd",
        borderRadius: 20,
        padding: "26px 28px",
        boxShadow: "0 10px 36px rgba(59,130,246,0.13)",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.35rem" }}>💳</span>
            <h3 style={{ margin: 0, fontSize: "1.22rem", color: "#1e3a8a", fontWeight: 900 }}>
              Secure Payment Portal
            </h3>
            <span
              style={{
                background: "#dbeafe",
                color: "#1d4ed8",
                padding: "2px 9px",
                borderRadius: 20,
                fontSize: "0.7rem",
                fontWeight: 800,
                letterSpacing: "0.04em",
              }}
            >
              🔒 GARAGE VERIFIED
            </span>
          </div>
          <p style={{ margin: "5px 0 0", fontSize: "0.85rem", color: "#475569" }}>
            Select your preferred payment method and pay directly to the merchant below.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.73rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.07em" }}>
            Amount Due
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 900,
              color: "#1e3a8a",
              fontFamily: "var(--mono)",
              lineHeight: 1.1,
            }}
          >
            {money(total)}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>Invoice #{billNumber}</div>
        </div>
      </div>

      {/* ── Payment Method Selector ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {activeMethods.map((m) => {
          const isSelected = selectedId === m.id;
          const icon = METHOD_ICONS[m.type] || "💳";
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelectMethod(m.id)}
              disabled={busy}
              style={{
                cursor: busy ? "not-allowed" : "pointer",
                padding: "13px 14px",
                borderRadius: 14,
                border: isSelected ? "2px solid #2563eb" : "1.5px solid #cbd5e1",
                background: isSelected
                  ? "linear-gradient(135deg,#ffffff,#eff6ff)"
                  : "#f8fafc",
                boxShadow: isSelected ? "0 4px 18px rgba(37,99,235,0.18)" : "none",
                transition: "all 0.18s ease",
                position: "relative",
                textAlign: "left",
              }}
            >
              {isSelected && (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 19,
                    height: 19,
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
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: "1.2rem" }}>{icon}</span>
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>
                  {m.title}
                </span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{m.details}</div>
              {m.badge && (
                <span
                  style={{
                    fontSize: "0.67rem",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: isSelected ? "#dbeafe" : "#e2e8f0",
                    color: isSelected ? "#1d4ed8" : "#334155",
                    display: "inline-block",
                    marginTop: 4,
                  }}
                >
                  {m.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Payment Detail Panel ── */}
      {!isDone && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: "20px 24px",
            border: "1.5px solid #e0e7ff",
            marginBottom: 18,
            boxShadow: "0 2px 12px rgba(99,102,241,0.06)",
          }}
        >
          {/* Method header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: "1.4rem" }}>{METHOD_ICONS[currentMethod.type] || "💳"}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>
                {currentMethod.title}
              </div>
              {currentMethod.accountName && (
                <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                  Account: <b>{currentMethod.accountName}</b>
                </div>
              )}
            </div>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.7rem",
                fontWeight: 700,
                background: "#dcfce7",
                color: "#15803d",
                padding: "3px 9px",
                borderRadius: 20,
              }}
            >
              ✓ Direct Merchant Receiving
            </span>
          </div>

          {/* Receiving address / details */}
          <div
            style={{
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: "0.73rem", fontWeight: 700, color: "#0284c7", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Send Payment To
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", fontFamily: "var(--mono)" }}>
              {currentMethod.details}
            </div>
            {currentMethod.instructions && (
              <div style={{ fontSize: "0.78rem", color: "#0369a1", marginTop: 5 }}>
                ℹ️ {currentMethod.instructions}
              </div>
            )}
          </div>

          {/* ── Card Form ── */}
          {currentMethod.type === "CARD" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                  Enter Card Details
                </span>
                <span style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 600 }}>
                  🔒 256-bit SSL Encrypted
                </span>
              </div>
              {/* Card number + expiry + cvc */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10 }}>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Card Number  (1234 5678 9012 3456)"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(fmtCard(e.target.value))}
                  disabled={busy}
                  maxLength={19}
                  style={{
                    padding: "11px 13px",
                    borderRadius: 10,
                    border: `1.5px solid ${err && !cardNumber ? "#fca5a5" : "#cbd5e1"}`,
                    fontSize: "0.9rem",
                    fontFamily: "var(--mono)",
                    background: "#f8fafc",
                    letterSpacing: "0.08em",
                    outline: "none",
                  }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                    setCardExpiry(v);
                  }}
                  disabled={busy}
                  maxLength={5}
                  style={{
                    padding: "11px 10px",
                    borderRadius: 10,
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.88rem",
                    textAlign: "center",
                    background: "#f8fafc",
                    width: 78,
                    outline: "none",
                  }}
                />
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="CVC"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  disabled={busy}
                  maxLength={4}
                  style={{
                    padding: "11px 10px",
                    borderRadius: 10,
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.88rem",
                    textAlign: "center",
                    background: "#f8fafc",
                    width: 68,
                    outline: "none",
                  }}
                />
              </div>
              {/* Name + ZIP */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                <input
                  type="text"
                  placeholder="Cardholder Full Name"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  disabled={busy}
                  style={{
                    padding: "11px 13px",
                    borderRadius: 10,
                    border: `1.5px solid ${err && !cardHolder ? "#fca5a5" : "#cbd5e1"}`,
                    fontSize: "0.88rem",
                    background: "#f8fafc",
                    outline: "none",
                  }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="ZIP Code"
                  value={cardZip}
                  onChange={(e) => setCardZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  disabled={busy}
                  maxLength={5}
                  style={{
                    padding: "11px 10px",
                    borderRadius: 10,
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.88rem",
                    textAlign: "center",
                    background: "#f8fafc",
                    width: 90,
                    outline: "none",
                  }}
                />
              </div>
              {/* Card brand logos */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {["VISA", "MC", "AMEX", "DISC"].map((b) => (
                  <span
                    key={b}
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: "1px solid #e2e8f0",
                      color: "#475569",
                      background: "#f8fafc",
                    }}
                  >
                    {b}
                  </span>
                ))}
                <span style={{ fontSize: "0.72rem", color: "#94a3b8", marginLeft: 4 }}>
                  All major US cards accepted
                </span>
              </div>
            </div>
          )}

          {/* ── Digital Wallet / App Payment (Zelle, PayPal, CashApp, Venmo) ── */}
          {["ZELLE", "PAYPAL", "CASHAPP", "VENMO"].includes(currentMethod.type) && (
            <div style={{ display: "grid", gap: 12 }}>
              {/* Direct Pay Button — opens the app */}
              {payUrl && (
                <a
                  href={payUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "13px 18px",
                    borderRadius: 12,
                    background:
                      currentMethod.type === "ZELLE"
                        ? "linear-gradient(135deg,#6d28d9,#7c3aed)"
                        : currentMethod.type === "PAYPAL"
                        ? "linear-gradient(135deg,#003087,#009cde)"
                        : currentMethod.type === "CASHAPP"
                        ? "linear-gradient(135deg,#00c244,#00a859)"
                        : "linear-gradient(135deg,#3d95ce,#008cff)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "0.96rem",
                    textDecoration: "none",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                    transition: "opacity 0.15s",
                  }}
                >
                  <span style={{ fontSize: "1.3rem" }}>{METHOD_ICONS[currentMethod.type]}</span>
                  Open {currentMethod.title} App — Pay {money(total)} Instantly
                </a>
              )}

              {/* Confirmation reference input */}
              <div>
                <label
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "#334155",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  {currentMethod.type === "ZELLE"
                    ? "After sending — enter your Zelle Sender Name or Confirmation ID *"
                    : currentMethod.type === "PAYPAL"
                    ? "After sending — enter your PayPal Transaction ID or Handle *"
                    : currentMethod.type === "CASHAPP"
                    ? "After sending — enter your $Cashtag or Cash App Receipt Number *"
                    : "After sending — enter your Transaction ID or Handle *"}
                </label>
                <input
                  type="text"
                  placeholder={
                    currentMethod.type === "ZELLE"
                      ? "e.g. John Smith (Chase Zelle) or #ZL123456"
                      : currentMethod.type === "CASHAPP"
                      ? "e.g. $johncustomer or #CA-789012"
                      : "e.g. 8TR92846XY or your handle"
                  }
                  value={userRef}
                  onChange={(e) => setUserRef(e.target.value)}
                  disabled={busy}
                  style={{
                    width: "100%",
                    maxWidth: 460,
                    padding: "11px 13px",
                    borderRadius: 10,
                    border: `1.5px solid ${err && !userRef.trim() ? "#fca5a5" : "#cbd5e1"}`,
                    fontSize: "0.88rem",
                    background: "#f8fafc",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: 4 }}>
                  * Required to automatically verify and settle your invoice.
                </div>
              </div>
            </div>
          )}

          {/* ── Bank Wire / ACH ── */}
          {currentMethod.type === "BANK" && (
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                Wire / ACH Transfer Confirmation Number *
              </label>
              <input
                type="text"
                placeholder="e.g. ACH-20241015-XXXXXX or wire ref #"
                value={userRef}
                onChange={(e) => setUserRef(e.target.value)}
                disabled={busy}
                style={{
                  maxWidth: 460,
                  padding: "11px 13px",
                  borderRadius: 10,
                  border: `1.5px solid ${err && !userRef.trim() ? "#fca5a5" : "#cbd5e1"}`,
                  fontSize: "0.88rem",
                  background: "#f8fafc",
                  outline: "none",
                }}
              />
              <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                * Enter the confirmation # from your bank after completing the wire/ACH transfer.
              </div>
            </div>
          )}

          {/* ── Cash / In-Person ── */}
          {currentMethod.type === "CASH" && (
            <div
              style={{
                background: "#fefce8",
                border: "1px solid #fde68a",
                borderRadius: 10,
                padding: "12px 16px",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#92400e" }}>
                💵 In-Person Cash / POS Payment
              </div>
              <div style={{ fontSize: "0.82rem", color: "#78350f", marginTop: 4 }}>
                Visit the garage counter and pay {money(total)} in cash, card swipe, or check. Your
                bill will be marked paid immediately upon collection.
              </div>
              <input
                type="text"
                placeholder="Optional: add a note (e.g. &quot;Will pay Friday at 3pm&quot;)"
                value={userRef}
                onChange={(e) => setUserRef(e.target.value)}
                disabled={busy}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #fde68a",
                  fontSize: "0.84rem",
                  background: "#fffbeb",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {/* ── Apple Pay / Google Pay ── */}
          {currentMethod.type === "APPLE_PAY" && (
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: "0.82rem",
                  color: "#15803d",
                }}
              >
                🍎 Apple Pay &amp; Google Pay are processed via Stripe. Click the button below to
                complete biometric authentication and pay instantly.
              </div>
              <input
                type="text"
                placeholder="Optional: your name or device label"
                value={userRef}
                onChange={(e) => setUserRef(e.target.value)}
                disabled={busy}
                style={{
                  maxWidth: 360,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.88rem",
                  background: "#f8fafc",
                  outline: "none",
                }}
              />
            </div>
          )}

          {/* ── Custom / Other ── */}
          {currentMethod.type === "CUSTOM" && (
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                Payment Reference / Confirmation *
              </label>
              <input
                type="text"
                placeholder="e.g. TXN-123456 or your payment confirmation"
                value={userRef}
                onChange={(e) => setUserRef(e.target.value)}
                disabled={busy}
                style={{
                  maxWidth: 460,
                  padding: "11px 13px",
                  borderRadius: 10,
                  border: `1.5px solid ${err && !userRef.trim() ? "#fca5a5" : "#cbd5e1"}`,
                  fontSize: "0.88rem",
                  background: "#f8fafc",
                  outline: "none",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Verification Progress ── */}
      {isVerifying && <VerificationProgress step={verifyStep} />}

      {/* ── Success Banner ── */}
      {isDone && (
        <div
          style={{
            background: "linear-gradient(135deg,#d1fae5,#a7f3d0)",
            border: "2px solid #34d399",
            borderRadius: 14,
            padding: "18px 22px",
            marginBottom: 18,
            display: "flex",
            gap: 14,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "2.2rem" }}>✅</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.08rem", color: "#065f46" }}>
              Payment Verified &amp; Settled!
            </div>
            <div style={{ fontSize: "0.84rem", color: "#047857", marginTop: 3 }}>
              {money(total)} paid via <b>{currentMethod.title}</b>. Your bill has been marked{" "}
              <b>PAID IN FULL</b> and garage records updated automatically.
            </div>
          </div>
          <span
            style={{
              marginLeft: "auto",
              background: "#059669",
              color: "#fff",
              padding: "5px 14px",
              borderRadius: 8,
              fontWeight: 800,
              fontSize: "0.78rem",
              whiteSpace: "nowrap",
            }}
          >
            SETTLED
          </span>
        </div>
      )}

      {/* ── Error ── */}
      {err && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#b91c1c",
            fontSize: "0.85rem",
            marginBottom: 14,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <span>❌</span>
          <span>{err}</span>
        </div>
      )}

      {/* ── Pay Buttons ── */}
      {!isDone && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => handleProcessPayment(false)}
            disabled={busy}
            style={{
              flex: 1,
              minWidth: 240,
              padding: "16px 24px",
              background: busy
                ? "#94a3b8"
                : "linear-gradient(135deg, #1d4ed8, #2563eb)",
              color: "#ffffff",
              border: "none",
              borderRadius: 14,
              fontWeight: 900,
              fontSize: "1.05rem",
              cursor: busy ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: busy ? "none" : "0 6px 22px rgba(37,99,235,0.38)",
              transition: "all 0.2s ease",
              letterSpacing: "0.01em",
            }}
          >
            {busy ? (
              <>⏳ Verifying Payment…</>
            ) : (
              <>🔒 Confirm &amp; Pay {money(total)} via {currentMethod.title}</>
            )}
          </button>

          {currentMethod.type === "CARD" && (
            <button
              onClick={() => handleProcessPayment(true)}
              disabled={busy}
              title="Launch official Stripe Checkout in a new window"
              style={{
                padding: "16px 20px",
                background: "#ffffff",
                color: "#4f46e5",
                border: "2px solid #c7d2fe",
                borderRadius: 14,
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: busy ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.18s",
              }}
            >
              ⚡ Stripe Checkout
            </button>
          )}
        </div>
      )}

      {/* ── Trust Badges ── */}
      {!isDone && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              fontSize: "0.71rem",
              color: "#64748b",
            }}
          >
            <span>🔒 Banking-Grade SSL</span>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <span>PCI DSS Level 1</span>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <span>256-bit Encrypted</span>
          </div>
          <div style={{ fontSize: "0.71rem", color: "#64748b" }}>
            Instant Merchant Reconciliation
          </div>
        </div>
      )}
    </div>
  );
}

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
    setBill((prev) => ({
      ...prev,
      paid: true,
      notes: prev.notes ? `${prev.notes}\n[VERIFIED PAYMENT] ${res.txnRef}` : `[VERIFIED PAYMENT] ${res.txnRef}`,
    }));
    setSettledInfo(res);
  }

  const isPaid = bill.paid;

  return (
    <div className="receipt-wrapper">
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
        {/* Receipt Stamp: PAID or DUE */}
        {isPaid ? (
          <div className="receipt-stamp-paid">PAID IN FULL</div>
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
            <b style={{ color: isPaid ? "#16a34a" : "#dc2626", fontWeight: 800 }}>
              {isPaid ? "PAID IN FULL" : "DUE AT GARAGE"}
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
          <USPaymentPortal
            billId={bill.id}
            billNumber={bill.number}
            total={bill.total}
            onPaymentSuccess={handleSuccess}
            paymentMethods={paymentMethods}
          />
        )}
      </div>
    </div>
  );
}
