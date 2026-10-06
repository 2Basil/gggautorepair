import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({ children }) {
  await requireOwner();
  return (
    <div className="container owner-shell">
      <aside className="side no-print">
        <h4>Owner portal</h4>
        <Link href="/owner"><Icon name="chart" size={18} /> Analytics</Link>
        <Link href="/owner/jobs"><Icon name="wrench" size={18} /> Jobs</Link>
        <Link href="/owner/records"><Icon name="search" size={18} /> Records</Link>
        <Link href="/owner/bills"><Icon name="receipt" size={18} /> Bills</Link>
        <Link href="/owner/bills/new"><Icon name="plus" size={18} /> Generate bill</Link>
        <Link href="/owner/catalog"><Icon name="list" size={18} /> Services &amp; prices</Link>
        <Link href="/owner/access"><Icon name="key" size={18} /> Owner access</Link>
      </aside>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
