"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";

export default function OwnerSidebar({ owner = true, pendingRequests = 0 }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href) => {
    if (href === "/owner") return pathname === "/owner";
    return pathname.startsWith(href);
  };

  return (
    <nav className="no-print owner-sidebar" aria-label="Owner navigation">
      {/* Top Bar Header */}
      <div className="owner-nav-header">
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <span className="pulse" style={{ width: 8, height: 8, background: "#4ade80" }} />
          <span style={{ fontSize: "0.76rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a8a29e" }}>
            {owner ? "Owner Portal" : "Staff Portal"}
          </span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>ZZZ Auto Care</span>
          <span className="tiny hide-sm" style={{ color: "#9ca3af", marginLeft: 4 }}>
            Live Garage Operations
          </span>
          {pendingRequests > 0 && (
            <span className="sidebar-badge" style={{ marginLeft: 6 }}>
              {pendingRequests} pending {pendingRequests === 1 ? "job" : "jobs"}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="btn btn-ghost btn-sm"
          style={{
            padding: "5px 12px",
            fontSize: "0.78rem",
            color: "#d8d2c2",
            borderColor: "rgba(255,255,255,0.15)",
            borderRadius: 8,
            gap: 6,
          }}
          title={collapsed ? "Expand navigation columns" : "Collapse navigation to compact bar"}
        >
          {collapsed ? "▼ Show Columns" : "▲ Hide Menu"}
        </button>
      </div>

      {/* Collapsed Compact View */}
      {collapsed && (
        <div className="owner-nav-collapsed-bar">
          <span style={{ fontSize: "0.76rem", color: "#928b7b", fontWeight: 600, textTransform: "uppercase" }}>
            Quick Links:
          </span>
          {owner && (
            <Link href="/owner" className={isActive("/owner") ? "active" : ""}>
              Dashboard
            </Link>
          )}
          <Link href="/owner/jobs" className={isActive("/owner/jobs") ? "active" : ""}>
            Vehicles &amp; Requests {pendingRequests > 0 && `(${pendingRequests})`}
          </Link>
          {owner && (
            <Link href="/owner/pricing" className={isActive("/owner/pricing") ? "active" : ""}>
              Pricing
            </Link>
          )}
          <Link href="/owner/records" className={isActive("/owner/records") ? "active" : ""}>
            Records
          </Link>
          <Link href="/owner/bills" className={isActive("/owner/bills") && pathname !== "/owner/bills/new" ? "active" : ""}>
            Bills
          </Link>
          <Link href="/owner/bills/new" className={`special ${isActive("/owner/bills/new") ? "active" : ""}`}>
            + Generate Bill
          </Link>
          {owner && (
            <Link href="/owner/ledger" className={isActive("/owner/ledger") ? "active" : ""}>
              Ledger
            </Link>
          )}
          {owner && (
            <Link href="/owner/employees" className={isActive("/owner/employees") ? "active" : ""}>
              Staff
            </Link>
          )}
          <Link href="/owner/settings" className={isActive("/owner/settings") ? "active" : ""}>
            Settings
          </Link>
        </div>
      )}

      {/* Expanded Columns View */}
      {!collapsed && (
        <div className="owner-nav-columns">
          {/* COLUMN 1: OVERVIEW */}
          {owner && (
            <div className="owner-nav-col">
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

          {/* COLUMN 2: VEHICLES & JOBS */}
          <div className="owner-nav-col">
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

          {/* COLUMN 3: BILLING & FINANCE */}
          <div className="owner-nav-col">
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

          {/* COLUMN 4: GARAGE ADMIN */}
          <div className="owner-nav-col">
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
        </div>
      )}
    </nav>
  );
}
