import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { STEPS, STATUS_LABEL, CATEGORIES, GARAGE } from "@/lib/config";
import { fmtDateTime, fmtDate, money, prettyReg } from "@/lib/format";
import ContactButtons from "@/components/ContactButtons";
import OwnerBillGenerator from "@/components/OwnerBillGenerator";
import OwnerTimelineManager from "@/components/OwnerTimelineManager";
import { updateJobStatus, addJobItem, removeJobItem, sendJobEstimate } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function OwnerJob({ params }) {
  const { id } = await params;
  const job = await db.job.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      user: true,
      vehicle: true,
      items: true,
      logs: { orderBy: { createdAt: "desc" } },
      bills: { orderBy: { id: "desc" } },
    },
  });
  if (!job) notFound();

  const paidBill = job.bills.find((b) => b.paid);
  const isPaid = !!paidBill;
  const isClosed = isPaid || job.status === "DELIVERED" || job.status === "CANCELLED";

  const services = await db.service.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] });
  const subtotal = job.items.reduce((a, i) => a + (i.qty || 1) * (i.unitPrice || 0), 0);
  const currentIdx = STEPS.findIndex((s) => s.key === job.status);
  const nextStep = STEPS[currentIdx + 1];

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Job {job.code}</span>
          <h1>
            {job.vehicle.make} {job.vehicle.model}{" "}
            <span className="reg" style={{ fontSize: "1rem", verticalAlign: "middle" }}>
              {prettyReg(job.vehicle.regNo)}
            </span>
          </h1>
          <div className="muted">{job.user.name} · {job.user.phone} · booked {fmtDate(job.createdAt)}</div>
        </div>
        <div className="row" style={{ alignItems: "center", gap: 10 }}>
          <span className={`badge ${job.status}`} style={{ fontSize: "0.9rem", padding: "6px 14px" }}>
            {STATUS_LABEL[job.status]}
          </span>
          <Link href="/owner/jobs" className="btn btn-ghost btn-sm">← Back to queries</Link>
        </div>
      </div>

      {/* Reschedule alert banner if customer sent a reschedule request */}
      {(() => {
        const rescheduleLog = job.logs.find((l) => l.note?.toLowerCase().includes("reschedule"));
        if (!rescheduleLog) return null;
        return (
          <div style={{
            background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
            border: "2px solid #3b82f6",
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            boxShadow: "0 4px 14px rgba(59, 130, 246, 0.12)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "1.8rem" }}>📅</span>
              <div>
                <div style={{ fontWeight: 800, color: "#1e40af", fontSize: "0.98rem" }}>
                  Customer Reschedule Request
                </div>
                <div style={{ color: "#1e3a8a", fontSize: "0.88rem", marginTop: 2 }}>
                  {rescheduleLog.note}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.74rem", marginTop: 2 }}>
                  Requested {fmtDateTime(rescheduleLog.createdAt)}
                </div>
              </div>
            </div>
            <a
              href={`tel:${job.user.phone}`}
              className="btn btn-dark btn-sm"
              style={{ fontSize: "0.82rem" }}
            >
              📞 Call to Confirm
            </a>
          </div>
        );
      })()}

      <div className="grid grid-2" style={{ alignItems: "start", marginBottom: 18 }}>
        {/* Customer request & Status */}
        <div className="card">
          <h3>Customer request</h3>
          <p style={{ background: "var(--cream-2)", padding: "10px 14px", borderRadius: 10, fontSize: "0.95rem" }}>
            “{job.query}”
          </p>
          <div className="row" style={{ marginTop: 10, marginBottom: 14 }}>
            <ContactButtons
              phone={job.user.phone}
              email={job.user.email}
              subject={`Your request ${job.code}`}
              text={`Hello ${job.user.name}, this is ZZZ AUTO REPAIR about your request ${job.code} for your ${job.vehicle.make} ${job.vehicle.model}: "${job.query}"`}
            />
          </div>

          <hr className="divider" />

          {/* Estimate option: ONLY show in the starting phase; once bill is paid or job is closed, do NOT show estimate */}
          {isPaid ? (
            <div style={{ background: "#dff1e6", color: "#1d5a3f", padding: "12px 16px", borderRadius: 12, marginBottom: 14 }}>
              <div style={{ fontWeight: 800 }}>✓ Bill {paidBill.number} Paid &amp; Settled</div>
              <div className="small" style={{ marginTop: 2 }}>
                Payment of <b>{money(paidBill.total)}</b> received. Estimate phase is closed.
              </div>
            </div>
          ) : !isClosed && job.status === "BOOKED" ? (
            <>
              <h4 style={{ margin: "0 0 4px" }}>Send / Update Estimate Price (Starting Phase)</h4>
              <p className="muted small" style={{ margin: "0 0 10px" }}>
                The customer receives a flashing notification with this starting quote to bring their vehicle in.
              </p>
              <form action={sendJobEstimate} style={{ marginBottom: 10 }}>
                <input type="hidden" name="jobId" value={job.id} />
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label className="tiny muted uppercase" style={{ fontWeight: 700 }}>Min Estimate ($)</label>
                    <input
                      type="number"
                      name="estMin"
                      defaultValue={job.estMin}
                      placeholder="Min $"
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="tiny muted uppercase" style={{ fontWeight: 700 }}>Max Estimate ($)</label>
                    <input
                      type="number"
                      name="estMax"
                      defaultValue={job.estMax}
                      placeholder="Max $"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="tiny muted uppercase" style={{ fontWeight: 700 }}>Note to customer</label>
                  <input
                    name="note"
                    placeholder="e.g. Estimate sent. Please bring your vehicle to the garage."
                    defaultValue="Estimate sent. Please bring your vehicle to the garage."
                  />
                </div>
                <button className="btn btn-primary btn-block">
                  Send Estimate to Customer 🔔
                </button>
              </form>
              <hr className="divider" />
            </>
          ) : null}

          <div style={{ background: "var(--cream-2)", padding: "10px 14px", borderRadius: 10, marginTop: 12 }}>
            <div className="tiny uppercase" style={{ fontWeight: 700, letterSpacing: "0.06em", color: "var(--muted)" }}>
              Live Status Tracking
            </div>
            <div className="row between" style={{ alignItems: "center", marginTop: 4 }}>
              <span className={`badge ${job.status}`}>{STATUS_LABEL[job.status]}</span>
              <span className="small muted">Manage timeline &amp; 100-char notes below ↓</span>
            </div>
          </div>
        </div>

        {/* Activity & Bills */}
        <div className="card">
          <h3>Activity log</h3>
          {job.logs.length === 0 && <div className="empty" style={{ padding: 14 }}>No activity logged yet.</div>}
          <div style={{ maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
            {job.logs.map((l) => (
              <div className="job-row" key={l.id} style={{ padding: "8px 0" }}>
                <span className={`badge ${l.status}`}>{STATUS_LABEL[l.status] || l.status}</span>
                <div className="grow small">{l.note || "—"}</div>
                <span className="muted tiny">{fmtDateTime(l.createdAt)}</span>
              </div>
            ))}
          </div>

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

      {/* Progress Timeline & Status Controls (exact same structure as customer, with 100 char notes and green/red status line) */}
      <OwnerTimelineManager
        jobId={job.id}
        currentStatus={job.status}
        logs={job.logs}
      />

      {/* Charges & Work Items Portal */}
      <div className="card">
        <div className="row between" style={{ alignItems: "baseline", marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Charges &amp; Work Items Portal</h3>
            <p className="muted small" style={{ margin: "2px 0 0" }}>
              The customer sees this same breakdown on their screen. Add any new fault, washing, or repair items with their amounts below.
            </p>
          </div>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            {/* Estimate ONLY shown when not yet paid / starting phase */}
            {isPaid ? (
              <div style={{ background: "#dff1e6", color: "#1d5a3f", padding: "6px 14px", borderRadius: 10, fontWeight: 700 }}>
                Final Paid: {money(paidBill.total)}
              </div>
            ) : !isClosed && (
              <div style={{ background: "var(--cream-2)", padding: "6px 14px", borderRadius: 10 }}>
                <span className="tiny muted uppercase" style={{ fontWeight: 700 }}>Estimate: </span>
                <b className="mono" style={{ color: "var(--accent)" }}>
                  {money(job.estMin)}{job.estMin !== job.estMax ? ` – ${money(job.estMax)}` : ""}
                </b>
              </div>
            )}
            {!isPaid && (
              <Link href={`/owner/bills/new?jobId=${job.id}`} className="btn btn-ghost btn-sm">
                Advanced bill editor →
              </Link>
            )}
          </div>
        </div>

        {/* Work items table */}
        <div className="table-scroll">
          <table className="tbl" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Item / Fault description</th>
                <th>Category</th>
                <th className="num">Qty</th>
                <th className="num">Rate</th>
                <th className="num">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {job.items.map((i) => (
                <tr key={i.id}>
                  <td><b>{i.description}</b></td>
                  <td className="muted">{i.category}</td>
                  <td className="num">{i.qty}</td>
                  <td className="num mono">{money(i.unitPrice)}</td>
                  <td className="num mono"><b>{money((i.qty || 1) * i.unitPrice)}</b></td>
                  <td className="right">
                    {!isPaid && (
                      <form action={removeJobItem}>
                        <input type="hidden" name="id" value={i.id} />
                        <button className="btn-link danger small">Remove</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {job.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="center muted" style={{ padding: "20px 0" }}>
                    No work items logged yet. Add faults, washing, or repair charges below.
                  </td>
                </tr>
              )}
              <tr style={{ background: "var(--cream-2)" }}>
                <td colSpan={4} className="right">
                  <b>Subtotal of work &amp; fault items</b>
                </td>
                <td className="num mono">
                  <b style={{ fontSize: "1.05rem" }}>{money(subtotal)}</b>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Add new point / fault form — only if bill not yet paid */}
        {!isPaid && (
          <form action={addJobItem} style={{ marginTop: 18 }} className="items-edit">
            <input type="hidden" name="jobId" value={job.id} />
            <div className="small muted" style={{ marginBottom: 8, fontWeight: 600 }}>
              + Add new point / fault / service (e.g. Car Washing, AC Leak, Brake caliper)
            </div>
            <div className="row-grid">
              <input
                name="description"
                placeholder="Description (e.g. Washing, Front brake pads, Oil filter)"
                list="svc-list"
                required
              />
              <select name="category" defaultValue="Repairing">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input name="qty" type="number" min="1" defaultValue="1" title="Quantity" />
              <input name="unitPrice" type="number" min="0" placeholder="Amount / Rate $" required />
              <span />
              <button className="btn btn-dark btn-sm">Add charge</button>
            </div>
            <datalist id="svc-list">
              {services.map((s) => <option key={s.id} value={s.name} />)}
              <option value="Car Washing & Detailing" />
              <option value="Engine Oil & Filter Change" />
              <option value="AC Gas Refill & Cooling Coil" />
              <option value="Brake Pads Replacement" />
              <option value="Wheel Alignment & Balancing" />
            </datalist>
          </form>
        )}

        {/* Generate Final Bill with Discount Column */}
        <OwnerBillGenerator
          jobId={job.id}
          subtotal={subtotal}
          defaultTax={GARAGE.taxPct}
          isPaid={isPaid}
          paidBill={paidBill}
        />
      </div>
    </>
  );
}
