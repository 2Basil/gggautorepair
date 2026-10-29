import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import ContactButtons from "@/components/ContactButtons";
import Pager from "@/components/Pager";
import { sendServiceReminder } from "@/app/actions";
import { fmtDate, prettyReg } from "@/lib/format";
import { GARAGE } from "@/lib/config";

export const dynamic = "force-dynamic";
const MONTHS = 6;

export default async function Reminders({ searchParams }) {
  await requireStaff();
  const sp = await searchParams;
  const PAGE = 25;
  const page = Math.max(1, parseInt(sp.page, 10) || 1);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - MONTHS);

  // Vehicles with no activity in the last 6 months and no open job
  const where = {
    createdAt: { lt: cutoff },
    jobs: { none: { OR: [{ createdAt: { gte: cutoff } }, { status: { notIn: ["DELIVERED", "CANCELLED"] } }] } },
  };
  const [vehicles, total] = await Promise.all([
    db.vehicle.findMany({
      where,
      include: { user: true, jobs: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
    db.vehicle.count({ where }),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal</span>
          <h1>Service reminders</h1>
          <div className="muted">Vehicles not serviced in the last {MONTHS} months. Send a friendly reminder by email, WhatsApp or call.</div>
        </div>
      </div>
      {sp.sent && <div className="alert ok">Reminder emailed.</div>}
      {sp.failed && <div className="alert err">Could not email this customer (email settings missing or no email on file).</div>}
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Vehicle</th><th>Customer</th><th>Last service</th><th>Reach out</th><th /></tr></thead>
          <tbody>
            {vehicles.map((v) => {
              const text = `Hi ${v.user.name}, it's been a while since your ${v.make} ${v.model} was serviced at ${GARAGE.name}. Book a visit any time!`;
              return (
                <tr key={v.id}>
                  <td>{v.make} {v.model} <span className="reg">{prettyReg(v.regNo)}</span></td>
                  <td>{v.user.name}</td>
                  <td>{v.jobs[0] ? fmtDate(v.jobs[0].createdAt) : "Never"}</td>
                  <td><ContactButtons phone={v.user.phone} email={v.user.email} text={text} subject="Time for a service check" /></td>
                  <td className="right">
                    <form action={sendServiceReminder}>
                      <input type="hidden" name="vehicleId" value={v.id} />
                      <button className="btn btn-dark btn-sm">Email reminder</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {vehicles.length === 0 && <div className="empty">Everyone is up to date. 🎉</div>}
      </div>
      <Pager basePath="/owner/reminders" page={page} pageSize={PAGE} total={total} />
    </>
  );
}
