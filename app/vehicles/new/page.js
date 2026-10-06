import { requireUser } from "@/lib/auth";
import AddVehicleForm from "./AddVehicleForm";

export default async function NewVehiclePage() {
  await requireUser("/vehicles/new");
  return (
    <div className="container page">
      <div className="auth-wrap" style={{ maxWidth: 680 }}>
        <span className="eyebrow">Register a vehicle</span>
        <h1 style={{ fontSize: "2.1rem" }}>Add another vehicle</h1>
        <p className="muted">You can register as many vehicles as you like and book each one separately.</p>
        <AddVehicleForm />
      </div>
    </div>
  );
}
