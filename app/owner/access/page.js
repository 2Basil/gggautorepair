import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { grantOwner, revokeOwner } from "@/app/actions";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Access({ searchParams }) {
  const me = await requireOwner();
  const sp = await searchParams;
  const owners = await db.user.findMany({ where: { role: "OWNER" }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>Owner access</h1>
          <div className="muted">Decide who can see analytics, records and generate bills.</div>
        </div>
      </div>

      {sp.ok && <div className="alert ok">Access granted.</div>}
      {sp.error === "notfound" && <div className="alert err">No registered account uses that email. Ask them to register first, or share the owner sign-up link below.</div>}
      {sp.error === "self" && <div className="alert err">You cannot remove your own owner access.</div>}

      <div className="grid grid-2" style={{ alignItems: "start", marginBottom: 18 }}>
        <div className="card">
          <h3>Grant access to a registered user</h3>
          <form action={grantOwner}>
            <div className="field"><label>Their account email</label><input name="email" type="email" required /></div>
            <button className="btn btn-primary">Make owner</button>
          </form>
        </div>
        <div className="card">
          <h3>Owner sign-up link</h3>
          <p className="muted small">Share <b>/owner-join</b> together with the access code that is set as <code>OWNER_ACCESS_CODE</code> in your <code>.env</code> file. Anyone with the code can create an owner account, so keep it private and change it when staff leave.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Email</th><th>Since</th><th /></tr></thead>
          <tbody>
            {owners.map((o) => (
              <tr key={o.id}>
                <td><b>{o.name}</b> {o.id === me.id && <span className="badge">You</span>}</td>
                <td>{o.email}</td>
                <td>{fmtDate(o.createdAt)}</td>
                <td className="right">
                  {o.id !== me.id && (
                    <form action={revokeOwner}>
                      <input type="hidden" name="id" value={o.id} />
                      <button className="btn-link danger small">Remove access</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
