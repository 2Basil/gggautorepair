"use client";

import { startTransition, useActionState, useRef, useState, useTransition } from "react";
import { registerCustomer, sendPhoneOtp, verifyPhoneOtp } from "@/app/actions";
import VehicleFields from "@/components/VehicleFields";

export default function RegisterForm() {
  const [state, action, pending] = useActionState(registerCustomer, null);
  const [step, setStep] = useState(1);
  const formRef = useRef(null);
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [otpMsg, setOtpMsg] = useState(null); // { type: "err" | "ok", text }
  const [otpBusy, startOtp] = useTransition();
  const verified = verifiedPhone !== "" && verifiedPhone === phone.trim();

  function sendCode() {
    setOtpMsg(null);
    startOtp(async () => {
      const r = await sendPhoneOtp(phone);
      if (r.error) return setOtpMsg({ type: "err", text: r.error });
      setOtpSent(true);
      setOtpMsg({ type: "ok", text: r.devCode ? `Dev mode: your code is ${r.devCode}` : `We sent a 6-digit code to ${r.phone}.` });
    });
  }
  function checkCode() {
    setOtpMsg(null);
    startOtp(async () => {
      const r = await verifyPhoneOtp(phone, code);
      if (r.error) return setOtpMsg({ type: "err", text: r.error });
      setVerifiedPhone(phone.trim());
      setOtpMsg({ type: "ok", text: "Mobile number verified." });
    });
  }
  const showStep = state?.error && state.step !== 2 ? 1 : step;

  function next() {
    const inputs = formRef.current.querySelectorAll("#step1 input");
    for (const el of inputs) if (!el.reportValidity()) return;
    if (!verified) { setOtpMsg({ type: "err", text: "Please verify your mobile number with the OTP to continue." }); return; }
    setStep(2);
  }

  return (
    <form
      ref={formRef}
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === 1) return next();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <div className="wizard-steps">
        <div className={showStep === 1 ? "on" : ""}><b>1</b> Your details</div>
        <div className={showStep === 2 ? "on" : ""}><b>2</b> Your vehicle</div>
      </div>
      {state?.error && <div className="alert err">{state.error}</div>}

      <div id="step1" hidden={showStep !== 1}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="name">Full name *</label>
            <input id="name" name="name" autoComplete="name" required />
          </div>
          <div className="field">
            <label htmlFor="email">Email *</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field full">
            <label htmlFor="phone">Mobile number *</label>
            <div className="row" style={{ gap: 8 }}>
              <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" minLength={8} required value={phone}
                onChange={(e) => { setPhone(e.target.value); setOtpSent(false); setCode(""); setOtpMsg(null); }} style={{ flex: 1 }} placeholder="e.g. 98765 43210 or +1 555 123 4567" />
              {verified
                ? <span className="badge paid" style={{ alignSelf: "center" }}>Verified ✓</span>
                : <button type="button" className="btn btn-dark btn-sm" onClick={sendCode} disabled={otpBusy || phone.trim().length < 8}>{otpSent ? "Resend" : "Send OTP"}</button>}
            </div>
            {otpSent && !verified && (
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} style={{ flex: 1 }} />
                <button type="button" className="btn btn-primary btn-sm" onClick={checkCode} disabled={otpBusy || code.length < 4}>Verify</button>
              </div>
            )}
            {otpMsg && <div className={`tiny ${otpMsg.type === "err" ? "" : "muted"}`} style={{ marginTop: 6, color: otpMsg.type === "err" ? "var(--accent)" : undefined }}>{otpMsg.text}</div>}
          </div>
          <div className="field">
            <label htmlFor="city">City</label>
            <input id="city" name="city" />
          </div>
          <div className="field">
            <label htmlFor="password">Password *</label>
            <input id="password" name="password" type="password" minLength={6} autoComplete="new-password" required />
          </div>
          <div className="field full">
            <label htmlFor="address">Address</label>
            <input id="address" name="address" autoComplete="street-address" />
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={next}>Continue to vehicle details →</button>
      </div>

      <div hidden={showStep !== 2}>
        <VehicleFields />
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
        </div>
        <p className="muted tiny" style={{ marginTop: 12 }}>You can add more vehicles any time from your dashboard.</p>
      </div>
    </form>
  );
}
