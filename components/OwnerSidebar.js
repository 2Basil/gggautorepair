"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";

export default function OwnerSidebar({ owner = true, pendingRequests = 0 }) {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === "/owner") return pathname === "/owner";
    return pathname.startsWith(href);
  };

  return (
    <aside className="side no-print owner-sidebar">
      {/* Brand Header */}
      <div className="sidebar-profile">
        <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 4 }}>
          <span className="pulse" style={{ width: 8, height: 8, background: "#4ade80" }} />
          <span style={{ fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a8a29e" }}>
            {owner ? "Owner Portal" : "Staff Portal"}
          </span>
        </div>
        <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
          ZZZ Auto Care
        </div>
        <div className="tiny" style={{ color: "#9ca3af", marginTop: 2 }}>
          Live Garage Operations
        </div>
      </div>

      {/* OVERVIEW */}
      {owner && (
        <div>
          <div className="sidebar-group-title">Overview</div>
          <div className="sidebar-links">
            <Link
              href="/owner"
              className={`sidebar-link ${isActive("/owner") ? "active" : ""}`}
            >
              <Icon name="chart" size={17} />
              <span>Dashboard &amp; Analytics</span>
            </Link>
          </div>
        </div>
      )}

      {/* OPERATIONS */}
      <div>
        <div className="sidebar-group-title">Vehicles &amp; Jobs</div>
        <div className="sidebar-links">
          <Link
            href="/owner/jobs"
            className={`sidebar-link ${isActive("/owner/jobs") ? "active" : ""}`}
          >
            <Icon name="car" size={17} />
            <span>Vehicles &amp; Requests</span>
            {pendingRequests > 0 && (
              <span className="sidebar-badge">{pendingRequests}</span>
            )}
          </Link>

          {owner && (
            <Link
              href="/owner/pricing"
              className={`sidebar-link ${isActive("/owner/pricing") ? "active" : ""}`}
            >
              <Icon name="list" size={17} />
              <span>Services &amp; Pricing</span>
            </Link>
          )}

          <Link
            href="/owner/records"
            className={`sidebar-link ${isActive("/owner/records") ? "active" : ""}`}
          >
            <Icon name="search" size={17} />
            <span>Customer History &amp; Records</span>
          </Link>
        </div>
      </div>

      {/* BILLING & FINANCE */}
      <div>
        <div className="sidebar-group-title">Billing &amp; Finance</div>
        <div className="sidebar-links">
          <Link
            href="/owner/bills"
            className={`sidebar-link ${isActive("/owner/bills") && pathname !== "/owner/bills/new" ? "active" : ""}`}
          >
            <Icon name="receipt" size={17} />
            <span>Invoices &amp; Bills</span>
          </Link>

          <Link
            href="/owner/bills/new"
            className={`sidebar-link special ${isActive("/owner/bills/new") ? "active" : ""}`}
          >
            <Icon name="plus" size={16} />
            <span>+ Generate Bill</span>
          </Link>

          {owner && (
            <Link
              href="/owner/ledger"
              className={`sidebar-link ${isActive("/owner/ledger") ? "active" : ""}`}
            >
              <Icon name="chart" size={17} />
              <span>Financial Ledger</span>
            </Link>
          )}
        </div>
      </div>

      {/* MANAGEMENT */}
      <div>
        <div className="sidebar-group-title">Garage Admin</div>
        <div className="sidebar-links">
          {owner && (
            <Link
              href="/owner/employees"
              className={`sidebar-link ${isActive("/owner/employees") ? "active" : ""}`}
            >
              <Icon name="user" size={17} />
              <span>Staff &amp; Mechanics</span>
            </Link>
          )}

          {owner && (
            <Link
              href="/owner/ai"
              className={`sidebar-link ${isActive("/owner/ai") ? "active" : ""}`}
            >
              <Icon name="sparkles" size={17} />
              <span>AI Price Learning</span>
            </Link>
          )}

          {owner && (
            <Link
              href="/owner/access"
              className={`sidebar-link ${isActive("/owner/access") ? "active" : ""}`}
            >
              <Icon name="key" size={17} />
              <span>Owner Access</span>
            </Link>
          )}

          <Link
            href="/owner/settings"
            className={`sidebar-link ${isActive("/owner/settings") ? "active" : ""}`}
          >
            <Icon name="settings" size={17} />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* Footer info */}
      <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "0.72rem", color: "#78716c" }}>
        <div>Garage System v2.4</div>
        <div style={{ color: "#4ade80", marginTop: 2 }}>● Live Connected</div>
      </div>
    </aside>
  );
}
