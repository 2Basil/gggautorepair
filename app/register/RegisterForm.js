"use client";

import { startTransition, useActionState, useRef, useState, useTransition, useEffect } from "react";
import { registerCustomer, sendPhoneOtp, verifyPhoneOtp } from "@/app/actions";
import VehicleFields from "@/components/VehicleFields";

/** Build a username slug from any string — mirrors the server-side buildUsername */
function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28) || "";
}

export default function RegisterForm({ channel = "email", verify = true }) {
  const [state, action, pending] = useActionState(registerCustomer, null);
  const [step, setStep] = useState(1);
  const formRef = useRef(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameEdited, setUsernameEdited] = useState(false);
  const byEmail = verify && channel === "email";
  const target = (byEmail ? email : phone).trim();
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [otpMsg, setOtpMsg] = useState(null); // { type: "err" | "ok", text }
  const [otpBusy, startOtp] = useTransition();
  const verified = !verify || (verifiedPhone !== "" && verifiedPhone === target);

  // Auto-suggest username from name when user hasn't manually edited it
  useEffect(() => {
    if (!usernameEdited) {
      setUsername(slugify(name));
    }
  }, [name, usernameEdited]);

  const usernameValid = username.length === 0 || (/^[a-z0-9_]{3,28}$/.test(username));

  function sendCode() {
    setOtpMsg(null);
    startOtp(async () => {
      const r = await sendPhoneOtp(target);
      if (r.error) return setOtpMsg({ type: "err", text: r.error });
      setOtpSent(true);
      setOtpMsg({ type: "ok", text: r.devCode ? `Dev mode: your code is ${r.devCode}` : `We sent a 6-digit code to ${r.target}. Check your inbox (and spam).` });
    });
  }
  function checkCode() {
    setOtpMsg(null);
    startOtp(async () => {
      const r = await verifyPhoneOtp(target, code);
      if (r.error) return setOtpMsg({ type: "err", text: r.error });
      setVerifiedPhone(target);
      setOtpMsg({ type: "ok", text: byEmail ? "Email verified." : "Mobile number verified." });
    });
  }
  const showStep = state?.error && state.step !== 2 ? 1 : step;

  function next() {
    const inputs = formRef.current.querySelectorAll("#step1 input");
    for (const el of inputs) if (!el.reportValidity()) return;
    if (verify && !verified) { setOtpMsg({ type: "err", text: byEmail ? "Please verify your email with the code to continue." : "Please verify your mobile number with the OTP to continue." }); return; }
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
            <input
              id="name" name="name" autoComplete="name" required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Username field */}
          <div className="field full">
            <label htmlFor="username">
              Username *
              <span className="muted" style={{ fontWeight: 400, marginLeft: 6, fontSize: "0.82em" }}>
                lowercase letters, numbers, underscores
              </span>
            </label>
            <div className="row" style={{ gap: 0, position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "var(--muted)", fontWeight: 600, pointerEvents: "none", userSelect: "none",
                fontSize: "0.95rem",
              }}>@</span>
              <input
                id="username"
                name="username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={28}
                pattern="[a-z0-9_]{3,28}"
                title="3-28 characters: lowercase letters, numbers, underscores"
                value={username}
                style={{ paddingLeft: 28, flex: 1 }}
                onChange={(e) => {
                  setUsernameEdited(true);
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                }}
              />
            </div>
            {username.length > 0 && (
              <div className="tiny" style={{ marginTop: 4, color: usernameValid ? "var(--muted)" : "var(--accent)" }}>
                {usernameValid
                  ? `Your profile will be @${username}`
                  : "3-28 chars: lowercase letters, numbers, underscores only."}
              </div>
            )}
          </div>

          <div className={byEmail ? "field full" : "field"}>
            <label htmlFor="email">Email *{byEmail ? " (we send a verification code here)" : ""}</label>
            {byEmail ? (
              <>
            <div className="row" style={{ gap: 8 }}>
              <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); setOtpSent(false); setCode(""); setOtpMsg(null); }} style={{ flex: 1 }} />
              {verified
                ? <span className="badge paid" style={{ alignSelf: "center" }}>Verified ✓</span>
                : <button type="button" className="btn btn-dark btn-sm" onClick={sendCode} disabled={otpBusy || target.length < 6}>{otpSent ? "Resend" : "Send code"}</button>}
            </div>
            {otpSent && !verified && (
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} style={{ flex: 1 }} />
                <button type="button" className="btn btn-primary btn-sm" onClick={checkCode} disabled={otpBusy || code.length < 4}>Verify</button>
              </div>
            )}
            {otpMsg && <div className="tiny" style={{ marginTop: 6, color: otpMsg.type === "err" ? "var(--accent)" : "var(--muted)" }}>{otpMsg.text}</div>}
              </>
            ) : (
              <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            )}
          </div>
          <div className={byEmail ? "field" : "field full"}>
            <label htmlFor="phone">Mobile number *</label>
            {byEmail ? (
              <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" minLength={8} required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. (555) 123-4567" />
            ) : !verify ? (
              <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" minLength={8} required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. (555) 123-4567" />
            ) : (
              <>
            <div className="row" style={{ gap: 8 }}>
              <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" minLength={8} required value={phone} onChange={(e) => { setPhone(e.target.value); setOtpSent(false); setCode(""); setOtpMsg(null); }} style={{ flex: 1 }} placeholder="e.g. (555) 123-4567" />
              {verified
                ? <span className="badge paid" style={{ alignSelf: "center" }}>Verified ✓</span>
                : <button type="button" className="btn btn-dark btn-sm" onClick={sendCode} disabled={otpBusy || target.length < 6}>{otpSent ? "Resend" : "Send code"}</button>}
            </div>
            {otpSent && !verified && (
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} style={{ flex: 1 }} />
                <button type="button" className="btn btn-primary btn-sm" onClick={checkCode} disabled={otpBusy || code.length < 4}>Verify</button>
              </div>
            )}
            {otpMsg && <div className="tiny" style={{ marginTop: 6, color: otpMsg.type === "err" ? "var(--accent)" : "var(--muted)" }}>{otpMsg.text}</div>}
              </>
            )}
          </div>
          <div className="field">
            <label htmlFor="city">City</label>
            <input id="city" name="city" />
          </div>
          <div className="field">
            <label htmlFor="password">Password *</label>
            <input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
          </div>
          <div className="field full">
            <label htmlFor="address">Address</label>
            <input id="address" name="address" autoComplete="street-address" />
          </div>
          <p className="muted small full" style={{ gridColumn: "1 / -1" }}>
            By creating an account you agree to our <a href="/terms" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Terms</a> and <a href="/privacy" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Privacy Policy</a>.
          </p>
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
