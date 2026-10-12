import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import OwnerSidebar from "@/components/OwnerSidebar";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({ children }) {
  const me = await requireStaff();
  const owner = me.role === "OWNER";
  const pendingRequests = await db.job.count({ where: { status: "BOOKED" } });

  return (
    <div className="container owner-shell">
      <OwnerSidebar owner={owner} pendingRequests={pendingRequests} />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
