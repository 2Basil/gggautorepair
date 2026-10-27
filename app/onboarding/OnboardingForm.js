"use client";

import { startTransition, useActionState, useRef, useState, useEffect } from "react";
import { completeGoogleOnboarding } from "@/app/actions";
import VehicleFields from "@/components/VehicleFields";

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28) || "";
}

export default function OnboardingForm({ initialData = {}, initialStep = 1 }) {
  const [state, action, pending] = useActionState(completeGoogleOnboarding, null);
  const [step, setStep] = useState(initialStep);
  const formRef = useRef(null);

  const [name, setName] = useState(initialData.name || "");
  const [phone, setPhone] = useState(initialData.phone || "");
  const [username, setUsername] = useState(initialData.username || slugify(initialData.name));
  const [usernameEdited, setUsernameEdited] = useState(Boolean(initialData.username));
  const [stepError, setStepError] = useState(null);

  useEffect(() => {
    if (!usernameEdited && name) {
      setUsername(slugify(name));
    }
  }, [name, usernameEdited]);

  const usernameValid = username.length === 0 || (/^[a-z0-9_]{3,28}$/.test(username));
  const showStep = state?.error && state.step !== 2 ? 1 : step;

  function nextStep() {
    setStepError(null);
    const step1Inputs = formRef.current?.querySelectorAll("#onboard-step1 input");
    if (step1Inputs) {
      for (const input of step1Inputs) {
        if (!input.reportValidity()) return;
      }
    }
    if (!phone || phone.trim().length < 8) {
      setStepError("Please provide a valid mobile number for booking confirmations.");
      return;
    }
    setStep(2);
  }

  return (
    <form
      ref={formRef}
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === 1) return nextStep();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <div className="wizard-steps">
        <div className={showStep === 1 ? "on" : ""}>
          <b>1</b> Your details
        </div>
        <div className={showStep === 2 ? "on" : ""}>
          <b>2</b> Your vehicle
        </div>
      </div>

      {(state?.error || stepError) && (
        <div className="alert err">{state?.error || stepError}</div>
      )}

      {/* STEP 1: Personal Details */}
      <div id="onboard-step1" hidden={showStep !== 1}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="name">Full Name *</label>
            <input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Taylor"
            />
          </div>

          <div className="field full">
            <label htmlFor="email">Google Account (Verified)</label>
            <div className="row" style={{ gap: 8 }}>
              <input
                id="email"
                type="email"
                value={initialData.email}
                disabled
                style={{ flex: 1, background: "var(--input-bg-disabled, #f1f5f9)", cursor: "not-allowed", opacity: 0.85 }}
              />
              <span className="badge paid" style={{ alignSelf: "center", padding: "6px 12px" }}>
                Google Verified ✓
              </span>
            </div>
          </div>

          <div className="field full">
            <label htmlFor="username">
              Username *
              <span className="muted" style={{ fontWeight: 400, marginLeft: 6, fontSize: "0.82em" }}>
                lowercase letters, numbers, underscores
              </span>
            </label>
            <div className="row" style={{ gap: 0, position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                  fontWeight: 600,
                  pointerEvents: "none",
                  userSelect: "none",
                  fontSize: "0.95rem",
                }}
              >
                @
              </span>
              <input
                id="username"
                name="username"
                required
                minLength={3}
                maxLength={28}
                pattern="[a-z0-9_]{3,28}"
                value={username}
                style={{ paddingLeft: 28, flex: 1 }}
                onChange={(e) => {
                  setUsernameEdited(true);
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                }}
              />
            </div>
            {username.length > 0 && (
              <div
                className="tiny"
                style={{ marginTop: 4, color: usernameValid ? "var(--muted)" : "var(--accent)" }}
              >
                {usernameValid
                  ? `Your profile will be @${username}`
                  : "3-28 chars: lowercase letters, numbers, underscores only."}
              </div>
            )}
          </div>

          <div className="field full">
            <label htmlFor="phone">Mobile number * (for garage updates & reminders)</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              minLength={8}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. (555) 123-4567"
            />
          </div>

          <div className="field">
            <label htmlFor="city">City</label>
            <input id="city" name="city" defaultValue={initialData.city || ""} placeholder="e.g. New York" />
          </div>

          <div className="field">
            <label htmlFor="address">Address</label>
            <input id="address" name="address" defaultValue={initialData.address || ""} placeholder="e.g. 123 Main St" />
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: 16 }}
          onClick={nextStep}
        >
          Continue to vehicle details →
        </button>
      </div>

      {/* STEP 2: Vehicle Details */}
      <div id="onboard-step2" hidden={showStep !== 2}>
        <VehicleFields hidden={showStep !== 2} />

        <div className="row" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setStep(1)}
          >
            ← Back to personal details
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={pending}
          >
            {pending ? "Finishing setup…" : "Complete setup & Go to Dashboard →"}
          </button>
        </div>
        <p className="muted tiny" style={{ marginTop: 12 }}>
          You can add more vehicles at any time from your dashboard.
        </p>
      </div>
    </form>
  );
}
