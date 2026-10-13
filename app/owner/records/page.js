import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { STATUS_LABEL, VEHICLE_TYPES } from "@/lib/config";
import { fmtDate, money, prettyReg, normReg } from "@/lib/format";

export const dynamic = "force-dynamic";

const TAB_ICONS = {
  customers: "👥",
  vehicles: "🚗",
  jobs: "🔧",
  bills: "🧾",
};

export default async function Records({ searchParams }) {
  await requireStaff();
  const sp = await searchParams;
  const tab = ["vehicles", "jobs", "bills", "customers"].includes(sp.tab) ? sp.tab : "customers";
  const q = String(sp.q || "").trim();
  const filter = String(sp.filter || "all");

  // Keyword token matching: split by spaces so queries like "Aarav Camry" or "Toyota 2022" match
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);

  // Overall analytics stats for the Owner banner
  const [totalUsers, totalVehicles, totalJobs, allBills] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.vehicle.count(),
    db.job.count(),
    db.bill.findMany({ select: { total: true, paid: true } }),
  ]);

  const totalRevenue = allBills.filter((b) => b.paid).reduce((acc, b) => acc + b.total, 0);
  const totalUnpaidDues = allBills.filter((b) => !b.paid).reduce((acc, b) => acc + b.total, 0);

  let rows = [];

  if (tab === "vehicles") {
    const vehicleWhere = terms.length > 0
      ? {
          AND: terms.map((t) => ({
            OR: [
              { regNo: { contains: t } },
              { make: { contains: t } },
              { model: { contains: t } },
              { color: { contains: t } },
              { fuel: { contains: t } },
              { type: { contains: t.toUpperCase() } },
              { user: { name: { contains: t } } },
              { user: { phone: { contains: t } } },
              { user: { email: { contains: t } } },
              { user: { username: { contains: t } } },
            ],
          })),
        }
      : {};

    rows = await db.vehicle.findMany({
      where: vehicleWhere,
      include: {
        user: true,
        jobs: { select: { id: true, createdAt: true, status: true }, orderBy: { createdAt: "desc" } },
        bills: { select: { id: true, total: true, paid: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } else if (tab === "jobs") {
    const jobWhere = terms.length > 0
      ? {
          AND: terms.map((t) => ({
            OR: [
              { code: { contains: t } },
              { query: { contains: t } },
              { status: { contains: t.toUpperCase() } },
              { vehicle: { regNo: { contains: t } } },
              { vehicle: { make: { contains: t } } },
              { vehicle: { model: { contains: t } } },
              { user: { name: { contains: t } } },
              { user: { phone: { contains: t } } },
              { user: { username: { contains: t } } },
            ],
          })),
        }
      : {};

    rows = await db.job.findMany({
      where: jobWhere,
      include: {
        user: true,
        vehicle: true,
        bills: { select: { id: true, paid: true, total: true }, orderBy: { id: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } else if (tab === "bills") {
    const billWhere = terms.length > 0
      ? {
          AND: terms.map((t) => ({
            OR: [
              { number: { contains: t } },
              { notes: { contains: t } },
              { vehicle: { regNo: { contains: t } } },
              { vehicle: { make: { contains: t } } },
              { vehicle: { model: { contains: t } } },
              { user: { name: { contains: t } } },
              { user: { phone: { contains: t } } },
            ],
          })),
        }
      : {};

    rows = await db.bill.findMany({
      where: billWhere,
      include: { user: true, vehicle: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } else {
    // Customers Tab with Multi-Keyword AND search matching across customer & vehicle data
    const customerWhere = {
      role: "CUSTOMER",
      ...(terms.length > 0
        ? {
            AND: terms.map((t) => ({
              OR: [
                { name: { contains: t } },
                { email: { contains: t } },
                { phone: { contains: t } },
                { username: { contains: t } },
                { userCode: { contains: t.toUpperCase() } },
                { city: { contains: t } },
                { address: { contains: t } },
                {
                  vehicles: {
                    some: {
                      OR: [
                        { make: { contains: t } },
                        { model: { contains: t } },
                        { regNo: { contains: t } },
                      ],
                    },
                  },
                },
                {
                  jobs: {
                    some: {
                      OR: [
                        { code: { contains: t } },
                        { query: { contains: t } },
                      ],
                    },
                  },
                },
              ],
            })),
          }
        : {}),
    };

    rows = await db.user.findMany({
      where: customerWhere,
      include: {
        vehicles: { select: { id: true, regNo: true, make: true, model: true, year: true } },
        bills: { select: { id: true, total: true, paid: true, number: true, createdAt: true } },
        jobs: { select: { id: true, status: true, query: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 2 },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Optional Quick Filters on Customers
    if (filter === "unpaid") {
      rows = rows.filter((u) => u.bills.some((b) => !b.paid));
    } else if (filter === "active") {
      rows = rows.filter((u) => u.jobs.some((j) => !["DELIVERED", "CANCELLED"].includes(j.status)));
    } else if (filter === "vip") {
      rows = rows.filter((u) => u.bills.reduce((a, b) => a + b.total, 0) >= 500);
    }
  }

  const tabUrl = (t, f = "all") => `/owner/records?tab=${t}&filter=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const filterUrl = (f) => `/owner/records?tab=${tab}&filter=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      {/* Page Header */}
      <div className="page-head" style={{ marginBottom: 20 }}>
        <div>
          <span className="eyebrow">Owner Platform</span>
          <h1>Customer History &amp; Intelligence</h1>
          <p className="muted small" style={{ marginTop: 4, marginBottom: 0 }}>
            Search customers with multi-keyword matching across names, usernames, phones, emails, vehicle plates, and service records.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/owner/bills/new" className="btn btn-primary btn-sm">
            + Generate Invoice
          </Link>
          <Link href="/owner/jobs" className="btn btn-ghost btn-sm">
            Live Workshop
          </Link>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 14,
        marginBottom: 24,
      }}>
        <div style={{
          background: "linear-gradient(135deg, #1e293b, #0f172a)",
          color: "#fff",
          padding: "16px 20px",
          borderRadius: 16,
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.15)",
        }}>
          <div style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", fontWeight: 700 }}>
            Total Customers
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 900, marginTop: 4 }}>
            {totalUsers}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
            Registered client accounts
          </div>
        </div>

        <div style={{
          background: "linear-gradient(135deg, #065f46, #047857)",
          color: "#fff",
          padding: "16px 20px",
          borderRadius: 16,
          boxShadow: "0 4px 16px rgba(4, 120, 87, 0.15)",
        }}>
          <div style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#a7f3d0", fontWeight: 700 }}>
            Lifetime Settled Revenue
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 900, marginTop: 4, fontFamily: "var(--mono)" }}>
            {money(totalRevenue)}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#6ee7b7", marginTop: 2 }}>
            Fully paid invoices
          </div>
        </div>

        <div style={{
          background: totalUnpaidDues > 0 ? "linear-gradient(135deg, #991b1b, #b91c1c)" : "linear-gradient(135deg, #374151, #1f2937)",
          color: "#fff",
          padding: "16px 20px",
          borderRadius: 16,
          boxShadow: "0 4px 16px rgba(185, 28, 28, 0.15)",
        }}>
          <div style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#fca5a5", fontWeight: 700 }}>
            Outstanding Dues
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 900, marginTop: 4, fontFamily: "var(--mono)" }}>
            {money(totalUnpaidDues)}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#fecaca", marginTop: 2 }}>
            {totalUnpaidDues > 0 ? "Pending customer collection" : "All accounts cleared"}
          </div>
        </div>

        <div style={{
          background: "linear-gradient(135deg, #312e81, #4338ca)",
          color: "#fff",
          padding: "16px 20px",
          borderRadius: 16,
          boxShadow: "0 4px 16px rgba(67, 56, 202, 0.15)",
        }}>
          <div style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#c7d2fe", fontWeight: 700 }}>
            Vehicles &amp; Jobs
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 900, marginTop: 4 }}>
            {totalVehicles} 🚗 · {totalJobs} 🔧
          </div>
          <div style={{ fontSize: "0.76rem", color: "#a5b4fc", marginTop: 2 }}>
            Service history records
          </div>
        </div>
      </div>

      {/* Prominent Multi-Keyword Search Bar */}
      <form method="get" style={{ marginBottom: 18 }}>
        <input type="hidden" name="tab" value={tab} />
        <input type="hidden" name="filter" value={filter} />
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)",
            fontSize: "1.25rem", pointerEvents: "none",
          }}>🔍</span>
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder={
              tab === "customers" ? "Keyword search: name, @username, phone, email, plate number, make/model (e.g., 'Aarav Camry')…" :
              tab === "vehicles" ? "Keyword search: reg plate, make, model, fuel type, or owner name…" :
              tab === "jobs" ? "Keyword search: job code, problem keyword, vehicle reg, customer name…" :
              "Keyword search: invoice number, notes, customer name, or plate…"
            }
            style={{
              width: "100%",
              padding: "16px 18px 16px 52px",
              fontSize: "1.05rem",
              borderRadius: 16,
              border: "2px solid #cbd5e1",
              background: "#ffffff",
              outline: "none",
              boxShadow: "0 4px 16px rgba(34,38,46,0.06)",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          />
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 6 }}>
            {q && (
              <Link href={`/owner/records?tab=${tab}&filter=${filter}`} className="btn btn-ghost btn-sm">
                ✕ Clear
              </Link>
            )}
            <button type="submit" className="btn btn-dark btn-sm" style={{ padding: "8px 16px" }}>
              Search Keywords
            </button>
          </div>
        </div>
      </form>

      {/* Keyword Search helper suggestions */}
      {!q && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 18, flexWrap: "wrap", fontSize: "0.78rem", color: "#64748b" }}>
          <span>💡 Quick keyword examples:</span>
          {["Toyota", "Aarav", "Civic", "Brakes", "Oil", "DL-01", "@username"].map((kw) => (
            <Link
              key={kw}
              href={`/owner/records?tab=${tab}&q=${encodeURIComponent(kw)}`}
              style={{
                padding: "3px 8px", background: "#f1f5f9", borderRadius: 6,
                color: "#334155", textDecoration: "none", fontWeight: 600, border: "1px solid #e2e8f0",
              }}
            >
              +{kw}
            </Link>
          ))}
        </div>
      )}

      {/* Tabs & Quick Filter Toolbar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12, marginBottom: 20,
      }}>
        {/* Main Tab Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["customers", "vehicles", "jobs", "bills"].map((t) => (
            <Link
              key={t}
              href={tabUrl(t, "all")}
              style={{
                padding: "9px 20px",
                borderRadius: 50,
                fontWeight: 700,
                fontSize: "0.92rem",
                textDecoration: "none",
                background: tab === t ? "var(--ink)" : "var(--card)",
                color: tab === t ? "var(--cream)" : "var(--muted)",
                border: `2px solid ${tab === t ? "var(--ink)" : "var(--line)"}`,
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: tab === t ? "0 2px 8px rgba(34,38,46,0.15)" : "none",
              }}
            >
              <span>{TAB_ICONS[t]}</span>
              <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
            </Link>
          ))}
        </div>

        {/* Quick Sub-filters for Customers tab */}
        {tab === "customers" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>Filter:</span>
            {[
              { id: "all", label: "All" },
              { id: "unpaid", label: "⚠️ Has Dues" },
              { id: "active", label: "🚗 In Garage Now" },
              { id: "vip", label: "⭐ VIP ($500+)" },
            ].map((f) => (
              <Link
                key={f.id}
                href={filterUrl(f.id)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  background: filter === f.id ? "#3b82f6" : "#f1f5f9",
                  color: filter === f.id ? "#ffffff" : "#475569",
                  border: `1px solid ${filter === f.id ? "#2563eb" : "#cbd5e1"}`,
                }}
              >
                {f.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>
          Found {rows.length} {tab}{rows.length === 1 ? "" : "s"} {q ? `matching keywords: “${q}”` : ""}
        </span>
      </div>

      {/* ── CUSTOMERS TAB ── */}
      {tab === "customers" && (
        <div style={{ display: "grid", gap: 14 }}>
          {rows.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "var(--muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 10 }}>👤</div>
              <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#1e293b" }}>No customer records found</div>
              <p className="small" style={{ marginTop: 6, color: "#64748b" }}>
                {q ? `No customer matches the keywords “${q}”. Try a single keyword like first name, phone number, or car model.` : "No customer records registered in the system."}
              </p>
            </div>
          )}

          {rows.map((u) => {
            const totalSpend = u.bills.reduce((a, b) => a + b.total, 0);
            const unpaid = u.bills.filter((b) => !b.paid).reduce((a, b) => a + b.total, 0);
            const paidBillsCount = u.bills.filter((b) => b.paid).length;
            const lastJob = u.jobs[0];
            const activeJob = u.jobs.find((j) => !["DELIVERED", "CANCELLED"].includes(j.status));

            const initials = u.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
            const colors = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];
            const avatarBg = colors[u.id % colors.length];

            return (
              <div
                key={u.id}
                style={{
                  background: "#ffffff",
                  border: unpaid > 0 ? "2px solid #fca5a5" : "1px solid var(--line)",
                  borderRadius: 18,
                  padding: "20px 24px",
                  display: "flex",
                  gap: 20,
                  alignItems: "flex-start",
                  boxShadow: "0 4px 14px rgba(34,38,46,0.06)",
                  transition: "box-shadow 0.2s, transform 0.15s",
                }}
              >
                {/* Colorful Avatar Badge */}
                <div style={{
                  width: 58, height: 58, borderRadius: 16, flexShrink: 0,
                  background: avatarBg, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: "1.25rem",
                  boxShadow: `0 4px 12px ${avatarBg}44`,
                }}>
                  {initials}
                </div>

                {/* Customer Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "#0f172a" }}>
                      {u.name}
                    </span>
                    {u.username && (
                      <span style={{
                        color: "#6366f1", fontWeight: 700, fontSize: "0.85rem",
                        background: "#e0e7ff", padding: "2px 8px", borderRadius: 6,
                      }}>
                        @{u.username}
                      </span>
                    )}
                    {u.userCode && (
                      <span className="reg" style={{ fontSize: "0.76rem" }}>
                        {u.userCode}
                      </span>
                    )}
                    {activeJob && (
                      <span style={{
                        background: "#fef3c7", color: "#b45309", padding: "2px 8px",
                        borderRadius: 6, fontSize: "0.72rem", fontWeight: 700,
                      }}>
                        🚗 In Bay: {activeJob.status}
                      </span>
                    )}
                  </div>

                  {/* Contact Toolbar with Direct Actions */}
                  <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <a
                      href={`tel:${u.phone}`}
                      style={{ color: "#334155", textDecoration: "none", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}
                    >
                      📱 {u.phone}{u.phoneVerified && " ✓"}
                    </a>
                    <a
                      href={`mailto:${u.email}`}
                      style={{ color: "#334155", textDecoration: "none", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}
                    >
                      ✉️ {u.email}
                    </a>
                    {u.city && <span style={{ color: "#64748b", fontSize: "0.84rem" }}>📍 {u.city}</span>}
                  </div>

                  {/* Registered Vehicles */}
                  <div style={{ marginTop: 10 }}>
                    <span style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>
                      Vehicles ({u.vehicles.length}):
                    </span>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      {u.vehicles.length > 0 ? (
                        u.vehicles.map((v) => (
                          <Link
                            key={v.regNo}
                            href={`/owner/vehicles/${v.id}`}
                            style={{
                              textDecoration: "none", padding: "4px 10px", background: "#f8fafc",
                              borderRadius: 8, fontSize: "0.78rem", fontWeight: 700, color: "#1e293b",
                              border: "1px solid #cbd5e1", display: "flex", alignItems: "center", gap: 6,
                            }}
                          >
                            <span>🚗</span>
                            <span>{v.make} {v.model} ({v.year})</span>
                            <span className="reg" style={{ fontSize: "0.72rem" }}>{prettyReg(v.regNo)}</span>
                          </Link>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>No registered vehicles yet</span>
                      )}
                    </div>
                  </div>

                  {/* Last Service Job Snippet */}
                  {lastJob && (
                    <div style={{ marginTop: 10, fontSize: "0.8rem", color: "#64748b", background: "#f8fafc", padding: "6px 12px", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                      <b>Recent Activity:</b> “{lastJob.query?.slice(0, 80)}{lastJob.query?.length > 80 ? "…" : ""}”
                      &nbsp;·&nbsp;<span className={`badge ${lastJob.status}`} style={{ fontSize: "0.68rem" }}>{STATUS_LABEL[lastJob.status]}</span>
                      &nbsp;·&nbsp;{fmtDate(lastJob.createdAt)}
                    </div>
                  )}
                </div>

                {/* Financial Summary & Actions */}
                <div style={{ textAlign: "right", flexShrink: 0, minWidth: 160 }}>
                  <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#0f172a", fontFamily: "var(--mono)" }}>
                    {money(totalSpend)}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                    Lifetime Spent ({paidBillsCount} {paidBillsCount === 1 ? "bill" : "bills"})
                  </div>

                  {unpaid > 0 ? (
                    <div style={{
                      marginTop: 6, padding: "4px 10px", background: "#fee2e2",
                      borderRadius: 6, color: "#dc2626", fontWeight: 800, fontSize: "0.82rem",
                    }}>
                      ⚠️ {money(unpaid)} Due
                    </div>
                  ) : (
                    <div style={{ marginTop: 6, color: "#16a34a", fontSize: "0.78rem", fontWeight: 700 }}>
                      ✓ Zero Balance
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
                    <Link
                      href={`/owner/records?tab=jobs&q=${encodeURIComponent(u.name)}`}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: "0.78rem", padding: "6px 10px" }}
                    >
                      All Services History →
                    </Link>
                    <Link
                      href={`/owner/bills/new?userId=${u.id}`}
                      className="btn btn-dark btn-sm"
                      style={{ fontSize: "0.78rem", padding: "6px 10px" }}
                    >
                      + Create Invoice
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── VEHICLES TAB ── */}
      {tab === "vehicles" && (
        <div style={{ display: "grid", gap: 14 }}>
          {rows.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "var(--muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 10 }}>🚗</div>
              <div style={{ fontWeight: 800 }}>No vehicles found{q ? ` for “${q}”` : ""}</div>
            </div>
          )}
          {rows.map((v) => {
            const totalSpend = v.bills.reduce((a, b) => a + b.total, 0);
            const paidBills = v.bills.filter((b) => b.paid).length;
            const activeCount = v.jobs.filter((j) => !["DELIVERED", "CANCELLED"].includes(j.status)).length;
            return (
              <div key={v.id} style={{
                background: "#ffffff", border: "1px solid var(--line)", borderRadius: 18,
                padding: "18px 24px", display: "flex", gap: 18, alignItems: "center",
                boxShadow: "0 4px 14px rgba(34,38,46,0.06)",
              }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 16, flexShrink: 0,
                  background: "linear-gradient(135deg, #0f172a, #2563eb)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.7rem", color: "#fff",
                }}>
                  🚗
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "#0f172a" }}>
                    {v.make} {v.model} <span style={{ fontWeight: 400, color: "#64748b" }}>({v.year})</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                    <span className="reg" style={{ fontSize: "0.85rem" }}>{prettyReg(v.regNo)}</span>
                    <span className="small muted">{VEHICLE_TYPES[v.type]?.label || v.type} · {v.fuel}</span>
                    {v.color && <span className="small muted">· {v.color}</span>}
                  </div>
                  <div className="small" style={{ marginTop: 6, color: "#334155" }}>
                    👤 <b>{v.user.name}</b> {v.user.username && `@${v.user.username}`} · 📱 {v.user.phone}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>
                    {v.jobs.length} garage visit{v.jobs.length !== 1 ? "s" : ""}
                    {v.jobs[0] && ` · Last visit: ${fmtDate(v.jobs[0].createdAt)}`}
                    {activeCount > 0 && <span style={{ color: "#dc2626", fontWeight: 700 }}> · {activeCount} in progress</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: "1.25rem", fontFamily: "var(--mono)", color: "#0f172a" }}>
                    {money(totalSpend)}
                  </div>
                  <div className="tiny muted">{paidBills}/{v.bills.length} bills settled</div>
                  <div style={{ marginTop: 10 }}>
                    <Link href={`/owner/vehicles/${v.id}`} className="btn btn-ghost btn-sm">
                      Vehicle History →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── JOBS TAB ── */}
      {tab === "jobs" && (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "var(--muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 10 }}>🔧</div>
              <div style={{ fontWeight: 800 }}>No service jobs found{q ? ` for “${q}”` : ""}</div>
            </div>
          )}
          {rows.map((j) => {
            const latestBill = j.bills?.[0];
            const isPaid = latestBill?.paid;
            return (
              <div key={j.id} style={{
                background: "#ffffff", border: "1px solid var(--line)", borderRadius: 16,
                padding: "16px 22px", display: "flex", gap: 16, alignItems: "center",
                boxShadow: "0 2px 10px rgba(34,38,46,0.05)",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: isPaid ? "#dcfce7" : j.status === "CANCELLED" ? "#fee2e2" : "#f1f5f9",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem",
                }}>
                  {isPaid ? "✅" : j.status === "CANCELLED" ? "❌" : "🔧"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <b style={{ fontFamily: "var(--mono)", fontSize: "1rem" }}>{j.code}</b>
                    <span className={`badge ${j.status}`} style={{ fontSize: "0.74rem" }}>{STATUS_LABEL[j.status]}</span>
                    <span className="tiny muted">{fmtDate(j.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "#334155", marginTop: 4, fontWeight: 500 }}>
                    “{j.query}”
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>
                    👤 {j.user.name} · 🚗 {j.vehicle.make} {j.vehicle.model} <span className="reg" style={{ fontSize: "0.72rem" }}>{prettyReg(j.vehicle.regNo)}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {latestBill && (
                    <div style={{ fontWeight: 900, fontSize: "1.1rem", color: isPaid ? "#16a34a" : "#dc2626", fontFamily: "var(--mono)" }}>
                      {isPaid ? "✓ " : ""}{money(latestBill.total)}
                    </div>
                  )}
                  <Link href={`/owner/jobs/${j.id}`} className="btn btn-ghost btn-sm" style={{ marginTop: 6 }}>
                    Manage Job
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── BILLS TAB ── */}
      {tab === "bills" && (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "var(--muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 10 }}>🧾</div>
              <div style={{ fontWeight: 800 }}>No bills found{q ? ` for “${q}”` : ""}</div>
            </div>
          )}
          {rows.map((b) => (
            <div key={b.id} style={{
              background: "#ffffff", border: `1.5px solid ${b.paid ? "#a7f3d0" : "#fca5a5"}`,
              borderLeft: `5px solid ${b.paid ? "#10b981" : "#ef4444"}`,
              borderRadius: 16, padding: "16px 22px", display: "flex", gap: 16, alignItems: "center",
              boxShadow: "0 2px 10px rgba(34,38,46,0.05)",
            }}>
              <div style={{ fontSize: "1.8rem" }}>{b.paid ? "✅" : "🧾"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <b style={{ fontFamily: "var(--mono)", fontSize: "1rem" }}>{b.number}</b>
                  <span className={`badge ${b.paid ? "paid" : "unpaid"}`} style={{ fontSize: "0.74rem" }}>
                    {b.paid ? "Paid in Full" : "Due"}
                  </span>
                  <span className="tiny muted">{fmtDate(b.createdAt)}</span>
                </div>
                <div style={{ fontSize: "0.86rem", color: "#334155", marginTop: 4 }}>
                  👤 <b>{b.user.name}</b> · 🚗 {b.vehicle.make} {b.vehicle.model}
                  <span className="reg" style={{ marginLeft: 8, fontSize: "0.74rem" }}>{prettyReg(b.vehicle.regNo)}</span>
                </div>
                {b.notes && (
                  <div className="tiny muted" style={{ marginTop: 2 }}>
                    Notes: {b.notes.slice(0, 100)}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 900, fontSize: "1.25rem", color: b.paid ? "#16a34a" : "#dc2626", fontFamily: "var(--mono)" }}>
                  {money(b.total)}
                </div>
                <Link href={`/owner/bills/${b.id}`} className="btn btn-ghost btn-sm" style={{ marginTop: 6 }}>
                  View Invoice
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="muted tiny" style={{ marginTop: 22, textAlign: "center" }}>
        Customer database powered by multi-keyword token matching. Showing up to 100 most recent records per view.
      </p>
    </>
  );
}
