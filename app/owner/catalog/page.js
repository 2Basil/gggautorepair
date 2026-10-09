import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATEGORIES } from "@/lib/config";
import { updateService, createService } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Catalog() {
  await requireOwner();
  const services = await db.service.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>Services &amp; prices</h1>
          <div className="muted">Base prices are for a hatchback. Sedans, SUVs and luxury cars are priced higher automatically. Keywords drive the estimate engine.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>Add a service</h3>
        <form action={createService} className="form-grid">
          <div className="field"><label>Name</label><input name="name" required /></div>
          <div className="field"><label>Category</label><select name="category">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label>Base price $</label><input name="basePrice" type="number" min="0" required /></div>
          <div className="field"><label>Keywords (comma separated)</label><input name="keywords" placeholder="brake, squeal, pedal" /></div>
          <div className="field full"><label>Description</label><input name="description" /></div>
          <div className="full"><button className="btn btn-dark">Add service</button></div>
        </form>
      </div>

      <div className="table-wrap">
        <table className="tbl catalog">
          <thead><tr><th>Category</th><th>Service</th><th>Base $</th><th>Keywords</th><th>Active</th><th /></tr></thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td className="muted">{s.category}</td>
                <td colSpan={5} style={{ padding: 0 }}>
                  <form action={updateService} className="svc-row">
                    <input type="hidden" name="id" value={s.id} />
                    <input name="name" defaultValue={s.name} />
                    <input name="basePrice" type="number" min="0" defaultValue={s.basePrice} />
                    <input name="keywords" defaultValue={s.keywords} />
                    <label className="row small"><input type="checkbox" name="active" defaultChecked={s.active} /></label>
                    <button className="btn btn-ghost btn-sm">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
