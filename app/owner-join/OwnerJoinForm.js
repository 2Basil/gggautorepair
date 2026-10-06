"use client";

import { useActionState } from "react";
import { joinAsOwner } from "@/app/actions";

export default function OwnerJoinForm() {
  const [state, action, pending] = useActionState(joinAsOwner, null);
  return (
    <form action={action} className="card">
      {state?.error && <div className="alert err">{state.error}</div>}
      <div className="field"><label>Access code</label><input name="code" type="password" required /></div>
      <div className="field"><label>Full name</label><input name="name" required /></div>
      <div className="field"><label>Email</label><input name="email" type="email" required /></div>
      <div className="field"><label>Password</label><input name="password" type="password" minLength={6} required /></div>
      <button className="btn btn-dark btn-block" disabled={pending}>{pending ? "Checking…" : "Create owner account"}</button>
    </form>
  );
}
