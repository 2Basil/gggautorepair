"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";
import Link from "next/link";

export default function LoginForm({ next }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card">
      {state?.error && <div className="alert err">{state.error}</div>}
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email">Email or Employee ID</label>
        <input id="email" name="email" type="text" autoComplete="username" autoCapitalize="none" required />
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
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className="btn btn-primary btn-block" disabled={pending}>{pending ? "Logging in…" : "Log in"}</button>
    </form>
  );
}
