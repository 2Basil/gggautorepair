"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

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
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className="btn btn-primary btn-block" disabled={pending}>{pending ? "Logging in…" : "Log in"}</button>
    </form>
  );
}
