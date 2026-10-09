import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({ children }) {
  const me = await requireStaff();
  const owner = me.role === "OWNER";
  return (
    <div className="container owner-shell">
      <aside className="side no-print">
        <h4>{owner ? "Owner portal" : "Staff portal"}</h4>
        {owner && <Link href="/owner"><Icon name="chart" size={18} /> Analytics</Link>}
        {owner && <Link href="/owner/pricing"><Icon name="list" size={18} /> 1 · Services &amp; prices</Link>}
        <Link href="/owner/jobs"><Icon name="wrench" size={18} /> {owner ? "2 · " : ""}Customer queries</Link>
        <Link href="/owner/bills"><Icon name="receipt" size={18} /> {owner ? "3 · " : ""}Bills</Link>
        {owner && <Link href="/owner/ledger"><Icon name="chart" size={18} /> 4 · Ledger</Link>}
        <Link href="/owner/bills/new"><Icon name="plus" size={18} /> Generate bill</Link>
        <Link href="/owner/records"><Icon name="search" size={18} /> Records</Link>
        {owner && <Link href="/owner/employees"><Icon name="key" size={18} /> Employees</Link>}
        {owner && <Link href="/owner/ai"><Icon name="sparkles" size={18} /> AI pricing</Link>}
        {owner && <Link href="/owner/access"><Icon name="key" size={18} /> Owner access</Link>}
        <Link href="/owner/settings"><Icon name="settings" size={18} /> Settings</Link>
      </aside>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
