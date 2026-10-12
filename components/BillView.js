import { GARAGE } from "@/lib/config";
import { fmtDateTime, money, prettyReg } from "@/lib/format";
import PrintButton from "./PrintButton";

export default function BillView({ bill, showPrices = true }) {
  return (
    <div className="receipt-wrapper">
      <div className="receipt-paper">
        {/* Receipt Stamp: PAID or DUE */}
        {bill.paid ? (
          <div className="receipt-stamp-paid">PAID IN FULL</div>
        ) : (
          <div className="receipt-stamp-due">PAY AT COUNTER</div>
        )}

        {/* Mall / Store Header */}
        <div className="receipt-header">
          <div style={{ fontSize: "0.75rem", letterSpacing: "0.18em", color: "#6b7280", textTransform: "uppercase", marginBottom: 3 }}>
            ★ RETAIL SERVICE SLIP ★
          </div>
          <h1 className="receipt-store-title">{GARAGE.name}</h1>
          <div className="receipt-store-sub">Official Tax Invoice & Cash Memo</div>
          <div className="receipt-store-meta">
            <div>{GARAGE.address}</div>
            <div>Tel: {GARAGE.phone} · {GARAGE.email}</div>
            {GARAGE.gstin && <div>GSTIN / Tax ID: <b>{GARAGE.gstin}</b></div>}
          </div>
        </div>

        <hr className="receipt-divider" />

        {/* Receipt Meta Key-Values */}
        <div style={{ display: "grid", gap: "2px" }}>
          <div className="receipt-kv">
            <span>INVOICE SERIAL NO:</span>
            <b style={{ letterSpacing: "0.06em", fontSize: "0.92rem", color: "#111827" }}>{bill.number}</b>
          </div>
          <div className="receipt-kv">
            <span>DATE & TIME:</span>
            <span>{fmtDateTime(bill.createdAt)}</span>
          </div>
          <div className="receipt-kv">
            <span>TERMINAL / COUNTER:</span>
            <span>Counter 01 · Service Bay</span>
          </div>
          <div className="receipt-kv">
            <span>PAYMENT STATUS:</span>
            <b style={{ color: bill.paid ? "#16a34a" : "#dc2626" }}>
              {bill.paid ? "PAID" : "DUE AT GARAGE"}
            </b>
          </div>
          <div className="receipt-kv">
            <span>BILLED TO:</span>
            <b style={{ color: "#111827" }}>{bill.user.name}</b>
          </div>
          <div className="receipt-kv">
            <span>PHONE / CONTACT:</span>
            <span>{bill.user.phone || "—"}</span>
          </div>
          <div className="receipt-kv">
            <span>VEHICLE:</span>
            <b>{bill.vehicle.make} {bill.vehicle.model} ({bill.vehicle.year})</b>
          </div>
          <div className="receipt-kv">
            <span>VEHICLE REG NO:</span>
            <span style={{ fontWeight: 800, letterSpacing: "0.05em", color: "#111827" }}>
              {prettyReg(bill.vehicle.regNo)}
            </span>
          </div>
          {bill.job && (
            <div className="receipt-kv">
              <span>JOB ORDER REF:</span>
              <span>#{bill.job.code}</span>
            </div>
          )}
        </div>

        <hr className="receipt-divider" />

        {/* Table Columns Header */}
        <div className="receipt-table-header">
          <span style={{ flex: 2.2 }}>ITEM / SERVICE</span>
          <span style={{ flex: 0.6, textAlign: "center" }}>QTY</span>
          {showPrices && <span style={{ flex: 1, textAlign: "right" }}>RATE</span>}
          {showPrices && <span style={{ flex: 1.2, textAlign: "right" }}>AMOUNT</span>}
        </div>
        <hr className="receipt-divider" style={{ margin: "4px 0 6px" }} />

        {/* Item Rows */}
        <div>
          {bill.items.map((i, k) => (
            <div key={i.id || k} className="receipt-item-row">
              <div style={{ flex: 2.2, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#111827", lineHeight: 1.25 }}>{i.description}</div>
                {i.category && (
                  <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 2 }}>{i.category}</div>
                )}
              </div>
              <div style={{ flex: 0.6, textAlign: "center", color: "#374151", fontWeight: 500 }}>
                {i.qty}
              </div>
              {showPrices && (
                <div style={{ flex: 1, textAlign: "right", fontFamily: "var(--mono)", fontSize: "0.82rem", color: "#4b5563" }}>
                  {money(i.unitPrice)}
                </div>
              )}
              {showPrices && (
                <div style={{ flex: 1.2, textAlign: "right", fontFamily: "var(--mono)", fontWeight: 700, color: "#111827" }}>
                  {money(i.qty * i.unitPrice)}
                </div>
              )}
            </div>
          ))}
        </div>

        <hr className="receipt-divider" />

        {/* Totals Section */}
        {showPrices && (
          <div>
            <div className="receipt-kv">
              <span>SUBTOTAL ({bill.items.length} {bill.items.length === 1 ? "item" : "items"}):</span>
              <span style={{ fontFamily: "var(--mono)" }}>{money(bill.subtotal)}</span>
            </div>
            {bill.discount > 0 && (
              <div className="receipt-kv" style={{ color: "#16a34a", fontWeight: 600 }}>
                <span>DISCOUNT APPLIED:</span>
                <span style={{ fontFamily: "var(--mono)" }}>− {money(bill.discount)}</span>
              </div>
            )}
            <div className="receipt-kv">
              <span>TAX / GST ({bill.taxPct}%):</span>
              <span style={{ fontFamily: "var(--mono)" }}>{money(bill.tax)}</span>
            </div>

            <hr className="receipt-divider-double" />

            <div className="receipt-grand-total">
              <span>NET PAYABLE</span>
              <span>{money(bill.total)}</span>
            </div>

            <hr className="receipt-divider-double" />
          </div>
        )}

        {/* Notes / Special remarks */}
        {bill.notes && (
          <div style={{ margin: "14px 0 10px", fontSize: "0.8rem", color: "#4b5563", background: "#f9fafb", padding: "8px 12px", borderRadius: "4px", border: "1px dashed #d1d5db" }}>
            <b>Special Remarks:</b> {bill.notes}
          </div>
        )}

        {/* Realistic Retail Barcode */}
        <div className="receipt-barcode">
          <div className="receipt-barcode-bars" />
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.82rem", letterSpacing: "0.22em", marginTop: 4, fontWeight: 700, color: "#1f2937" }}>
            *{bill.number}*
          </div>
        </div>

        {/* Mall Receipt Footer Message */}
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div className="receipt-thanks">*** THANK YOU FOR VISITING ***</div>
          <div style={{ fontSize: "0.76rem", color: "#6b7280", marginTop: 4 }}>
            Please retain this receipt for vehicle warranty and service records.
          </div>
          <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: 6 }}>
            Authorized Digital Tax Invoice · Unique Serial ID: {bill.number}
          </div>
        </div>
      </div>

      {/* Print action (hidden during print) */}
      <div className="no-print" style={{ marginTop: 22, display: "flex", gap: "10px" }}>
        <PrintButton />
      </div>
    </div>
  );
}

