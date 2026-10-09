"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions";

export default function ChangePassword() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="card" style={{ maxWidth: 460 }}>
      <h3>Change password</h3>
      {state?.error && <div className="alert err">{state.error}</div>}
      {state?.ok && <div className="alert ok">{state.ok}</div>}
      <div className="field"><label htmlFor="current">Current password</label><input id="current" name="current" type="password" autoComplete="current-password" required /></div>
      <div className="field"><label htmlFor="next">New password (8+ characters)</label><input id="next" name="next" type="password" minLength={8} autoComplete="new-password" required /></div>
      <div className="field"><label htmlFor="again">Repeat new password</label><input id="again" name="again" type="password" minLength={8} autoComplete="new-password" required /></div>
      <button className="btn btn-dark" disabled={pending}>{pending ? "Saving…" : "Change password"}</button>
    </form>
  );
}
