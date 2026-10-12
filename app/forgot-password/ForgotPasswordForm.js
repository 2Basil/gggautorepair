"use client";

import { useState, useTransition } from "react";
import { sendPasswordResetOtp, resetPassword } from "@/app/actions";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [step, setStep] = useState(1); // 1 = email, 2 = code + new password
  const [email, setEmail] = useState("");
  const [devCode, setDevCode] = useState(null);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const [isPending, startTransition] = useTransition();

  function handleSendCode(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const emailVal = fd.get("email");
    setError(null);
    startTransition(async () => {
      const res = await sendPasswordResetOtp(emailVal);
      if (res?.error) {
        setError(res.error);
      } else {
        setEmail(emailVal);
        setDevCode(res.devCode || null);
        setStep(2);
      }
    });
  }

  function handleReset(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    setError(null);
    startTransition(async () => {
      const res = await resetPassword(email, fd.get("code"), fd.get("password"), fd.get("confirm"));
      if (res?.error) {
        setError(res.error);
      } else {
        setOk(res.ok);
      }
    });
  }

  if (ok) {
    return (
      <div className="card">
        <div className="alert ok" style={{ marginBottom: 0 }}>
          <strong>Password reset!</strong> {ok}
        </div>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/login" className="btn btn-primary">
            Log in with new password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Step indicator */}
      <div className="wizard-steps" style={{ marginBottom: 18 }}>
        <div className={step === 1 ? "on" : ""}>
          <b>1</b> Email
        </div>
        <div className={step === 2 ? "on" : ""}>
          <b>2</b> Verify &amp; Reset
        </div>
      </div>

      {step === 1 && (
        <form className="card" onSubmit={handleSendCode}>
          {error && <div className="alert err">{error}</div>}
          <div className="field">
            <label htmlFor="fp-email">Email address</label>
            <input
              id="fp-email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              placeholder="you@example.com"
              required
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={isPending}>
            {isPending ? "Sending code…" : "Send verification code"}
          </button>
          <p className="small muted center" style={{ marginTop: 14, marginBottom: 0 }}>
            Remembered it?{" "}
            <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Back to Log in
            </Link>
          </p>
        </form>
      )}

      {step === 2 && (
        <form className="card" onSubmit={handleReset}>
          {error && <div className="alert err">{error}</div>}

          {devCode && (
            <div className="alert ok">
              <strong>Dev mode:</strong> Your code is <span className="mono" style={{ fontSize: "1.1em", letterSpacing: "0.1em" }}>{devCode}</span>
            </div>
          )}

          <p className="small muted" style={{ marginTop: 0, marginBottom: 14 }}>
            We sent a 6-digit code to <strong>{email}</strong>.{" "}
            <button
              type="button"
              className="btn-link"
              onClick={() => { setStep(1); setError(null); setDevCode(null); }}
            >
              Change email
            </button>
          </p>

          <div className="field">
            <label htmlFor="fp-code">Verification code</label>
            <input
              id="fp-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="fp-password">New password</label>
            <input
              id="fp-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="fp-confirm">Confirm new password</label>
            <input
              id="fp-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your new password"
              required
            />
          </div>

          <button className="btn btn-primary btn-block" disabled={isPending}>
            {isPending ? "Resetting…" : "Reset password"}
          </button>
        </form>
      )}
    </>
  );
}
