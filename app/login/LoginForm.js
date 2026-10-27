"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";
import Link from "next/link";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function LoginForm({ next }) {
  const [state, action, pending] = useActionState(login, null);

  return (
    <div className="card">
      <GoogleSignInButton next={next} label="Continue with Google" />

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--line, #e2e8f0)" }} />
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--muted, #64748b)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: 600,
          }}
        >
          or with email / employee ID
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--line, #e2e8f0)" }} />
      </div>

      <form action={action}>
        {state?.error && <div className="alert err" style={{ marginBottom: 14 }}>{state.error}</div>}
        <input type="hidden" name="next" value={next} />

        <div className="field">
          <label htmlFor="email">Email or Employee ID</label>
          <input
            id="email"
            name="email"
            type="text"
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
            autoComplete="current-password"
            required
          />
        </div>
        <button className="btn btn-primary btn-block" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
