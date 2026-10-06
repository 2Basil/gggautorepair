"use client";

import { useActionState } from "react";
import { addVehicle } from "@/app/actions";
import VehicleFields from "@/components/VehicleFields";

export default function AddVehicleForm() {
  const [state, action, pending] = useActionState(addVehicle, null);
  return (
    <form action={action} className="card">
      {state?.error && <div className="alert err">{state.error}</div>}
      <VehicleFields />
      <button className="btn btn-primary btn-block" disabled={pending}>{pending ? "Saving…" : "Save vehicle"}</button>
    </form>
  );
}
