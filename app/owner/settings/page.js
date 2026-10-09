import { requireStaff } from "@/lib/auth";
import ChangePassword from "./ChangePassword";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const me = await requireStaff();
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>Settings</h1>
          <div className="muted">Signed in as <b>{me.empId || me.email}</b></div>
        </div>
      </div>
      <ChangePassword />
    </>
  );
}
