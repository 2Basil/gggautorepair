"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";
import { GARAGE } from "@/lib/config";
import Icon from "./Icon";
import { PartIcon } from "./Parts";

export function Brand({ href = "/" }) {
  return (
    <Link href={href} className="brand">
      <span className="brand-mark">
        <PartIcon name="gear" size={30} stroke={2.6} />
      </span>
      <span className="brand-name">{GARAGE.name}</span>
    </Link>
  );
}

export default function HeaderClient({ user }) {
  const pathname = usePathname();
  const isOwnerPortal = pathname?.startsWith("/owner");

  const links = (
    <>
      <Link href="/#services">Services</Link>
      <Link href="/plans">Plans</Link>
      <Link href="/book">Book &amp; Estimate</Link>
      {user && <Link href="/dashboard">My Vehicles</Link>}
      {user && <Link href="/bills">My Bills</Link>}
    </>
  );

  return (
    <header className="site-header">
      <div className="container header-row">
        <Brand href={isOwnerPortal ? "/owner" : "/"} />
        <nav className="nav-desktop">
          {!isOwnerPortal && links}
          {isOwnerPortal && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--accent)",
                background: "rgba(200, 69, 43, 0.08)",
                border: "1px solid rgba(200, 69, 43, 0.2)",
                padding: "4px 12px",
                borderRadius: 999,
                letterSpacing: "0.02em",
              }}
            >
              <span className="pulse" style={{ width: 7, height: 7, background: "var(--accent)" }} />
              {user?.role === "OWNER" ? "Owner Portal" : "Staff Portal"}
            </span>
          )}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              {isOwnerPortal ? (
                <Link href="/" className="btn btn-ghost btn-sm" title="Go to customer website">
                  <Icon name="arrow" size={15} style={{ transform: "rotate(180deg)" }} />
                  <span className="hide-sm">View Website</span>
                </Link>
              ) : (
                (user.role === "OWNER" || user.role === "EMPLOYEE") && (
                  <Link href="/owner" className="btn btn-dark btn-sm">
                    <Icon name="key" size={16} /> {user.role === "OWNER" ? "Owner Portal" : "Staff Portal"}
                  </Link>
                )
              )}
              <form action={logout}>
                <button className="btn btn-ghost btn-sm" title={user.email}>
                  <Icon name="logout" size={16} /> <span className="hide-sm">Log out</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
          <details className="nav-mobile">
            <summary aria-label="Menu"><Icon name="menu" size={22} /></summary>
            <div className="nav-mobile-panel">
              {isOwnerPortal ? (
                <>
                  <Link href="/">← Customer Website</Link>
                  <Link href="/owner">Dashboard</Link>
                  <Link href="/owner/jobs">Vehicles &amp; Requests</Link>
                  <Link href="/owner/bills">Invoices &amp; Bills</Link>
                </>
              ) : (
                <>
                  {links}
                  {!user && <Link href="/login">Log in</Link>}
                </>
              )}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
