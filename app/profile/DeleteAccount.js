"use client";

import { useActionState } from "react";
import { deleteAccount } from "@/app/actions";

export default function DeleteAccount() {
  const [state, action, pending] = useActionState(deleteAccount, null);
  return (
    <form action={action} className="stack" style={{ gap: 10 }}>
      {state?.error && <div className="alert err">{state.error}</div>}
      <div className="field"><label htmlFor="dpw">Your password</label><input id="dpw" name="password" type="password" autoComplete="current-password" required /></div>
      <div className="field"><label htmlFor="dcf">Type DELETE to confirm</label><input id="dcf" name="confirm" required /></div>
      <button className="btn btn-ghost btn-sm" style={{ color: "#b91c1c" }} disabled={pending}>{pending ? "Deleting…" : "Delete my account"}</button>
    </form>
  );
}
