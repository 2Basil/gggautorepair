import { GARAGE } from "@/lib/config";
import { fmtDate, money, prettyReg } from "@/lib/format";
import PrintButton from "./PrintButton";

export default function BillView({ bill, showPrices = true }) {
  return (
    <div>
      <div className="bill">
        {bill.paid && <div className="stamp">PAID</div>}
        <div className="bill-head">
          <div>
            <h1>{GARAGE.name}</h1>
            <div className="muted small">{GARAGE.address}</div>
            <div className="muted small">{GARAGE.phone} · {GARAGE.email}</div>
            {GARAGE.gstin && <div className="muted small">Tax ID: {GARAGE.gstin}</div>}
          </div>
          <div className="right">
            <div className="eyebrow" style={{ margin: 0 }}>Tax invoice</div>
            <div style={{ font: "800 1.4rem var(--display)" }}>{bill.number}</div>
            <div className="muted small">{fmtDate(bill.createdAt)}</div>
          </div>
        </div>

        <div className="meta">
          <div>
            <h4>Billed to</h4>
            <b>{bill.user.name}</b>
            <div className="small muted">{bill.user.phone}</div>
            <div className="small muted">{bill.user.email}</div>
          </div>
          <div>
            <h4>Vehicle</h4>
            <b>{bill.vehicle.make} {bill.vehicle.model}</b> ({bill.vehicle.year})
            <div style={{ marginTop: 4 }}><span className="reg">{prettyReg(bill.vehicle.regNo)}</span></div>
            {bill.job && <div className="small muted" style={{ marginTop: 4 }}>Job {bill.job.code}</div>}
          </div>
        </div>

        <div className="table-scroll">
        <table className="tbl">
          <thead>
            <tr><th>#</th><th>Description</th><th>Category</th><th className="num">Qty</th>{showPrices && <th className="num">Rate</th>}{showPrices && <th className="num">Amount</th>}</tr>
          </thead>
          <tbody>
            {bill.items.map((i, k) => (
              <tr key={i.id}>
                <td>{k + 1}</td>
                <td>{i.description}</td>
                <td className="muted">{i.category}</td>
                <td className="num">{i.qty}</td>
                {showPrices && <td className="num mono">{money(i.unitPrice)}</td>}
                {showPrices && <td className="num mono">{money(i.qty * i.unitPrice)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {showPrices && (
        <div className="totals">
          <div><span>Subtotal</span><span className="mono">{money(bill.subtotal)}</span></div>
          {bill.discount > 0 && <div><span>Discount</span><span className="mono">− {money(bill.discount)}</span></div>}
          <div><span>Tax ({bill.taxPct}%)</span><span className="mono">{money(bill.tax)}</span></div>
          <div className="grand"><span>Total</span><span>{money(bill.total)}</span></div>
        </div>
        )}

        {bill.notes && <p className="muted small" style={{ marginTop: 20 }}><b>Notes:</b> {bill.notes}</p>}
        <p className="muted tiny" style={{ marginTop: 24 }}>Thank you for choosing {GARAGE.name}. Payment status: {bill.paid ? "Paid" : "Due at the garage"}.</p>
      </div>
      <div className="center no-print" style={{ marginTop: 18 }}>
        <PrintButton />
      </div>
    </div>
  );
}
