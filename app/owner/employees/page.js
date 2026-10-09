import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { resetEmployeePassword, removeEmployee } from "@/app/actions";
import AddEmployee from "./AddEmployee";

export const dynamic = "force-dynamic";

export default async function Employees({ searchParams }) {
  await requireOwner();
  const sp = await searchParams;
  const staff = await db.user.findMany({ where: { role: "EMPLOYEE" }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>Employees</h1>
          <div className="muted">Add staff who can handle customer queries and bills. They log in on the normal login page with their Employee ID and password. They cannot see prices, analytics, the ledger, employees or owner settings.</div>
        </div>
      </div>

      <AddEmployee />

      {sp.reset && <div className="alert ok">Password updated.</div>}
      {sp.error && <div className="alert err">Password must be at least 6 characters.</div>}

      <div className="table-wrap" style={{ marginTop: 18 }}>
        <table className="tbl">
          <thead><tr><th>Name</th><th>Employee ID</th><th>Added</th><th>Reset password</th><th /></tr></thead>
          <tbody>
            {staff.map((e) => (
              <tr key={e.id}>
                <td><b>{e.name}</b></td>
                <td><span className="reg">{e.empId}</span></td>
                <td>{fmtDate(e.createdAt)}</td>
                <td>
                  <form action={resetEmployeePassword} className="row" style={{ gap: 6 }}>
                    <input type="hidden" name="id" value={e.id} />
                    <input name="password" type="text" minLength={6} placeholder="New password" required style={{ maxWidth: 170 }} />
                    <button className="btn btn-ghost btn-sm">Set</button>
                  </form>
                </td>
                <td className="right">
                  <form action={removeEmployee}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="btn-link danger small">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {staff.length === 0 && <div className="empty">No employees yet.</div>}
      </div>
    </>
  );
}
