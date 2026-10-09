"use client";

import { useActionState, useRef } from "react";
import { addEmployee } from "@/app/actions";

export default function AddEmployee() {
  const ref = useRef(null);
  const [state, action, pending] = useActionState(async (prev, fd) => {
    const r = await addEmployee(prev, fd);
    if (r?.ok) ref.current?.reset();
    return r;
  }, null);
  return (
    <form ref={ref} action={action} className="card">
      <h3>Add an employee</h3>
      {state?.error && <div className="alert err">{state.error}</div>}
      {state?.ok && <div className="alert ok">{state.ok}</div>}
      <div className="form-grid">
        <div className="field"><label htmlFor="ename">Name</label><input id="ename" name="name" required /></div>
        <div className="field"><label htmlFor="eid">Employee ID (used to log in)</label><input id="eid" name="empId" required autoCapitalize="none" placeholder="e.g. john.k" /></div>
        <div className="field"><label htmlFor="epw">Password (6+ characters)</label><input id="epw" name="password" type="text" minLength={6} required autoComplete="off" /></div>
        <div className="field" style={{ alignSelf: "end" }}><button className="btn btn-dark" disabled={pending}>{pending ? "Adding…" : "Add employee"}</button></div>
      </div>
    </form>
  );
}
