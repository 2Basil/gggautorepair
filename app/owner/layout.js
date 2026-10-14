import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import OwnerSidebar from "@/components/OwnerSidebar";
import OwnerEstimateAlert from "@/components/OwnerEstimateAlert";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({ children }) {
  const me = await requireStaff();
  const owner = me.role === "OWNER";
  const pendingRequests = await db.job.count({ where: { status: "BOOKED" } });

  const pendingJobs = await db.job.findMany({
    where: { status: "BOOKED" },
    orderBy: { createdAt: "desc" },
    include: {
      vehicle: true,
      user: true,
      logs: { orderBy: { createdAt: "desc" } },
    },
  });

  const serializedJobs = pendingJobs.map((j) => {
    const ownerQuoted = j.logs?.some((l) => l.note?.startsWith("Estimate sent:"));
    return {
      id: j.id,
      code: j.code,
      query: j.query,
      estMin: ownerQuoted ? j.estMin : 0,
      estMax: ownerQuoted ? j.estMax : 0,
      ownerQuoted: !!ownerQuoted,
      status: j.status,
      createdAt: j.createdAt.toISOString(),
      vehicle: {
        make: j.vehicle?.make || "Vehicle",
        model: j.vehicle?.model || "",
        regNo: j.vehicle?.regNo || "",
        year: j.vehicle?.year || "",
      },
      user: {
        name: j.user?.name || "Customer",
        phone: j.user?.phone || "",
        email: j.user?.email || "",
      },
    };
  });

  return (
    <div className="container owner-shell">
      <OwnerSidebar owner={owner} pendingRequests={pendingRequests} />
      <div style={{ minWidth: 0, width: "100%" }}>
        <OwnerEstimateAlert initialRequests={serializedJobs} />
        {children}
      </div>
    </div>
  );
}

