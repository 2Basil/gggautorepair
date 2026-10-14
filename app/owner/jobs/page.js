import Link from "next/link";
import { db } from "@/lib/db";
import { STATUS_LABEL, STATUS_KEYS } from "@/lib/config";
import { fmtDate, money, prettyReg } from "@/lib/format";
import ContactButtons from "@/components/ContactButtons";

export const dynamic = "force-dynamic";

export default async function OwnerJobs({ searchParams }) {
  const sp = await searchParams;
  const status = STATUS_KEYS.includes(sp.status) ? sp.status : "";
  const jobs = await db.job.findMany({
    where: status ? { status } : {},
    include: {
      user: true,
      vehicle: true,
      bills: { select: { id: true, paid: true, total: true }, orderBy: { id: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>Customer queries</h1>
          <div className="muted">
            Incoming customer requests. Provide estimates at starting, inspect vehicles, update work items, and generate the final bill once complete.
          </div>
        </div>
      </div>
      <div className="tabs" style={{ flexWrap: "wrap" }}>
        <Link href="/owner/jobs" className={!status ? "on" : ""}>All</Link>
        {STATUS_KEYS.map((k) => (
          <Link key={k} href={`/owner/jobs?status=${k}`} className={status === k ? "on" : ""}>{STATUS_LABEL[k]}</Link>
        ))}
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Job</th>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Customer</th>
              <th>Request</th>
              <th>Estimate / Bill</th>
              <th>Status</th>
              <th>Contact</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => {
              const paidBill = j.bills.find((b) => b.paid);
              const latestBill = j.bills[0];
              const isPaid = !!paidBill;
              const hasBill = !!latestBill;
              const isClosed = isPaid || j.status === "DELIVERED" || j.status === "CANCELLED";

              return (
                <tr key={j.id}>
                  <td><b>{j.code}</b></td>
                  <td>{fmtDate(j.createdAt)}</td>
                  <td>
                    {j.vehicle.make} {j.vehicle.model}
                    <div><span className="reg">{prettyReg(j.vehicle.regNo)}</span></div>
                  </td>
                  <td>
                    {j.user.name}
                    <div className="muted small">{j.user.phone}</div>
                  </td>
                  <td className="muted small" style={{ maxWidth: 220 }}>{j.query}</td>

                  {/* Estimate column: ONLY show estimate during starting phase; once billed/paid, show final bill status */}
                  <td>
                    {isPaid ? (
                      <span className="badge paid" style={{ fontWeight: 700 }}>
                        ✓ Paid {money(paidBill.total)}
                      </span>
                    ) : hasBill ? (
                      <span className="badge unpaid" style={{ fontWeight: 700 }}>
                        Due {money(latestBill.total)}
                      </span>
                    ) : j.estMin > 0 ? (
                      <span className="mono" style={{ fontWeight: 600, color: "var(--accent)" }}>
                        {money(j.estMin)}{j.estMin !== j.estMax ? ` – ${money(j.estMax)}` : ""}
                      </span>
                    ) : (
                      <span className="badge" style={{ background: "#fee2e2", color: "#b91c1c", fontWeight: 700 }}>
                        ⚠️ Quote Needed
                      </span>
                    )}
                  </td>

                  <td><span className={`badge ${j.status}`}>{STATUS_LABEL[j.status]}</span></td>
                  <td>
                    <ContactButtons
                      phone={j.user.phone}
                      email={j.user.email}
                      subject={`Your request ${j.code}`}
                      text={`Hello ${j.user.name}, this is ZZZ AUTO REPAIR about your request ${j.code} for your ${j.vehicle.make} ${j.vehicle.model}: "${j.query}"`}
                    />
                  </td>
                  <td className="right nowrap">
                    {/* Estimate option is ONLY for starting phase; once bill exists or is paid, do not show estimate option */}
                    {hasBill ? (
                      <Link href={`/owner/bills/${latestBill.id}`} className="btn btn-ghost btn-sm">
                        View Bill
                      </Link>
                    ) : !isClosed && j.status === "BOOKED" ? (
                      <Link href={`/owner/bills/new?jobId=${j.id}&estimate=1`} className="btn btn-primary btn-sm">
                        Estimated bill
                      </Link>
                    ) : null}{" "}
                    <Link href={`/owner/jobs/${j.id}`} className="btn btn-dark btn-sm">
                      Manage
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {jobs.length === 0 && <div className="empty">No jobs here.</div>}
      </div>
    </>
  );
}
