import Link from "next/link";
import { getUser } from "@/lib/auth";
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

export default async function Header() {
  const user = await getUser();
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
        <Brand />
        <nav className="nav-desktop">{links}</nav>
        <div className="header-actions">
          {user ? (
            <>
              {user.role === "OWNER" && (
                <Link href="/owner" className="btn btn-dark btn-sm">
                  <Icon name="key" size={16} /> Owner Portal
                </Link>
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
            <div className="nav-mobile-panel">{links}</div>
          </details>
        </div>
      </div>
    </header>
  );
}
