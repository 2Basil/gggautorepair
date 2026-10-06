"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { registerCustomer } from "@/app/actions";
import VehicleFields from "@/components/VehicleFields";

export default function RegisterForm() {
  const [state, action, pending] = useActionState(registerCustomer, null);
  const [step, setStep] = useState(1);
  const formRef = useRef(null);
  const showStep = state?.error && state.step !== 2 ? 1 : step;

  function next() {
    const inputs = formRef.current.querySelectorAll("#step1 input");
    for (const el of inputs) if (!el.reportValidity()) return;
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
          <div className="field">
            <label htmlFor="phone">Phone *</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" minLength={8} required />
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
