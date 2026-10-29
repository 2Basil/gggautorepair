import { requireStaff } from "@/lib/auth";
import { estimateState } from "@/lib/estimateState";
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
      logs: {
        where: { OR: [{ note: { startsWith: "Estimate sent:" } }, { note: { contains: "customer accepted" } }, { note: { contains: "booked service" } }] },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  const serializedJobs = pendingJobs.map((j) => {
    const { quoted: ownerQuoted, accepted: customerAccepted, ownerNote } = estimateState(j);
    return {
      id: j.id,
      code: j.code,
      query: j.query,
      estMin: ownerQuoted ? j.estMin : 0,
      estMax: ownerQuoted ? j.estMax : 0,
      ownerQuoted: !!ownerQuoted,
      ownerNote,
      customerAccepted: !!customerAccepted,
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

