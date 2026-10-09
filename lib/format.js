export const money = (n) => "$" + Number(n || 0).toLocaleString("en-US");

const TZ = "Asia/Kolkata";
export const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
export const fmtDateTime = (d) =>
  new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  });

export const normReg = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const prettyReg = (s) => {
  const r = normReg(s);
  const m = r.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : r;
};

export function billTotals(items, discount = 0, taxPct = 18) {
  const subtotal = items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.unitPrice || 0), 0);
  const d = Math.min(Math.max(0, Number(discount) || 0), subtotal);
  const tax = Math.round(((subtotal - d) * (Number(taxPct) || 0)) / 100);
  return { subtotal, discount: d, tax, total: subtotal - d + tax };
}
