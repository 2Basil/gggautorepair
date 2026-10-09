import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { STEPS, STATUS_LABEL, CATEGORIES } from "@/lib/config";
import { fmtDateTime, fmtDate, money, prettyReg } from "@/lib/format";
import ContactButtons from "@/components/ContactButtons";
import { updateJobStatus, addJobItem, removeJobItem } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function OwnerJob({ params }) {
  const { id } = await params;
  const job = await db.job.findUnique({
    where: { id: Number(id) || 0 },
    include: { user: true, vehicle: true, items: true, logs: { orderBy: { createdAt: "desc" } }, bills: true },
  });
  if (!job) notFound();
  const services = await db.service.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] });
  const subtotal = job.items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
  const currentIdx = STEPS.findIndex((s) => s.key === job.status);
  const nextStep = STEPS[currentIdx + 1];

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Job {job.code}</span>
          <h1>{job.vehicle.make} {job.vehicle.model} <span className="reg" style={{ fontSize: "1rem", verticalAlign: "middle" }}>{prettyReg(job.vehicle.regNo)}</span></h1>
          <div className="muted">{job.user.name} · {job.user.phone} · booked {fmtDate(job.createdAt)}</div>
        </div>
        <span className={`badge ${job.status}`} style={{ fontSize: "0.9rem", padding: "6px 14px" }}>{STATUS_LABEL[job.status]}</span>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start", marginBottom: 18 }}>
        <div className="card">
          <h3>Customer request</h3>
          <p>“{job.query}”</p>
          <div className="row" style={{ marginTop: 10 }}>
            <ContactButtons phone={job.user.phone} email={job.user.email} subject={`Your request ${job.code}`} text={`Hello ${job.user.name}, this is ZZZ AUTO REPAIR about your request ${job.code} for your ${job.vehicle.make} ${job.vehicle.model}: "${job.query}"`} />
            <Link href={`/owner/bills/new?jobId=${job.id}&estimate=1`} className="btn btn-primary btn-sm">Estimated bill</Link>
          </div>
          <hr className="divider" />
          <h3>Update status</h3>
          <p className="muted small">The customer sees this instantly on their live tracker.</p>
          <form action={updateJobStatus}>
            <input type="hidden" name="jobId" value={job.id} />
            <div className="field">
              <label>New status</label>
              <select name="status" defaultValue={nextStep?.key || job.status}>
                {STEPS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="field">
              <label>Note to customer (optional)</label>
              <input name="note" placeholder="e.g. Brake pads replaced, rotor resurfaced" />
            </div>
            <button className="btn btn-primary btn-block">Update status</button>
          </form>
        </div>

        <div className="card">
          <h3>Activity</h3>
          {job.logs.map((l) => (
            <div className="job-row" key={l.id} style={{ padding: "10px 0" }}>
              <span className={`badge ${l.status}`}>{STATUS_LABEL[l.status]}</span>
              <div className="grow small">{l.note || "—"}</div>
              <span className="muted tiny">{fmtDateTime(l.createdAt)}</span>
            </div>
          ))}
          <hr className="divider" />
          <h3>Bills for this job</h3>
          {job.bills.length === 0 && <p className="muted small">No bill generated yet.</p>}
          {job.bills.map((b) => (
            <div className="job-row" key={b.id} style={{ padding: "8px 0" }}>
              <b className="grow">{b.number}</b>
              <b>{money(b.total)}</b>
              <span className={`badge ${b.paid ? "paid" : "unpaid"}`}>{b.paid ? "Paid" : "Due"}</span>
              <Link href={`/owner/bills/${b.id}`} className="btn btn-ghost btn-sm">Open</Link>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <h3>Work items &amp; charges</h3>
          <Link href={`/owner/bills/new?jobId=${job.id}`} className="btn btn-primary btn-sm">Generate bill from these items</Link>
        </div>
        <div className="table-scroll"><table className="tbl" style={{ marginTop: 8 }}>
          <thead><tr><th>Description</th><th>Category</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th><th /></tr></thead>
          <tbody>
            {job.items.map((i) => (
              <tr key={i.id}>
                <td>{i.description}</td>
                <td className="muted">{i.category}</td>
                <td className="num">{i.qty}</td>
                <td className="num mono">{money(i.unitPrice)}</td>
                <td className="num mono">{money(i.qty * i.unitPrice)}</td>
                <td className="right">
                  <form action={removeJobItem}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="btn-link danger small">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
            <tr><td colSpan={4} className="right"><b>Subtotal (before Tax)</b></td><td className="num mono"><b>{money(subtotal)}</b></td><td /></tr>
          </tbody>
        </table></div>

        <form action={addJobItem} style={{ marginTop: 18 }} className="items-edit">
          <input type="hidden" name="jobId" value={job.id} />
          <div className="small muted" style={{ marginBottom: 8 }}>Add a line item (parts, labour, extra work)</div>
          <div className="row-grid">
            <input name="description" placeholder="Description (e.g. Brake pads — front set)" list="svc-list" required />
            <select name="category" defaultValue="Repairing">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            <input name="qty" type="number" min="1" defaultValue="1" />
            <input name="unitPrice" type="number" min="0" placeholder="Rate $" required />
            <span />
            <button className="btn btn-dark btn-sm">Add</button>
          </div>
          <datalist id="svc-list">{services.map((s) => <option key={s.id} value={s.name} />)}</datalist>
        </form>
      </div>
    </>
  );
}
