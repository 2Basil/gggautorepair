"use client";

import { useActionState, useState } from "react";
import { login } from "@/app/actions";
import Link from "next/link";

export default function LoginForm({ next }) {
  const [state, action, pending] = useActionState(login, null);
  const [emailVal, setEmailVal] = useState("");
  const [passwordVal, setPasswordVal] = useState("");

  function quickFill(email, pass) {
    setEmailVal(email);
    setPasswordVal(pass);
  }

  return (
    <form action={action} className="card">
      {state?.error && <div className="alert err">{state.error}</div>}
      <input type="hidden" name="next" value={next} />

      <div style={{ marginBottom: 14, background: "rgba(0,0,0,0.03)", padding: "10px 12px", borderRadius: 10 }}>
        <div className="tiny muted uppercase" style={{ fontWeight: 800, marginBottom: 6 }}>
          ⚡ 1-Tap Quick Credentials
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            className="chip"
            onClick={() => quickFill("owner@pitstop.local", "owner123")}
            style={{ fontSize: "0.76rem", padding: "4px 10px", fontWeight: 700 }}
          >
            👑 Owner Login (owner@pitstop.local)
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => quickFill("rohan@example.com", "password")}
            style={{ fontSize: "0.76rem", padding: "4px 10px", fontWeight: 700 }}
          >
            🚗 Customer Login (rohan@example.com)
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="email">Email or Employee ID</label>
        <input
          id="email"
          name="email"
          type="text"
          value={emailVal}
          onChange={(e) => setEmailVal(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          required
        />
      </div>
      <div className="field">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label htmlFor="password">Password</label>
          <Link
            href="/forgot-password"
            style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600 }}
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          value={passwordVal}
          onChange={(e) => setPasswordVal(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <button className="btn btn-primary btn-block" disabled={pending}>{pending ? "Logging in…" : "Log in"}</button>
    </form>
  );
}
