import { requireUser } from "@/lib/auth";
import Link from "next/link";
import UsernameForm from "./UsernameForm";
import Icon from "@/components/Icon";
import DeleteAccount from "./DeleteAccount";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Profile — ZZZ Auto Garage" };

export default async function ProfilePage() {
  const user = await requireUser("/profile");

  return (
    <div className="container page" style={{ maxWidth: 600 }}>
      <div className="page-head" style={{ marginBottom: 28 }}>
        <div>
          <span className="eyebrow">Account</span>
          <h1>My Profile</h1>
        </div>
        <Link href="/dashboard" className="btn btn-ghost btn-sm">
          ← Dashboard
        </Link>
      </div>

      {/* Avatar / identity card */}
      <div className="card" style={{ marginBottom: 20, display: "flex", gap: 20, alignItems: "center" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, var(--accent), #ff8a65)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.6rem", fontWeight: 800, color: "#fff",
        }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1.15rem" }}>{user.name}</div>
          {user.username && (
            <div className="muted small" style={{ marginTop: 2 }}>@{user.username}</div>
          )}
          <div className="muted small" style={{ marginTop: 2 }}>{user.email}</div>
          {user.userCode && (
            <div className="muted small" style={{ marginTop: 2 }}>
              Customer ID: <span className="reg">{user.userCode}</span>
            </div>
          )}
        </div>
      </div>

      {/* Username section */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="at-sign" size={18} />
          Username
        </h2>
        <p className="muted small" style={{ marginBottom: 14 }}>
          Your username is a unique handle for your account. It's assigned automatically when you register,
          but you can change it here any time.
        </p>
        <UsernameForm current={user.username} />
      </div>

      {/* Account details (read-only) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="user" size={18} />
          Account details
        </h2>
        <dl className="kv">
          <dt>Full name</dt><dd>{user.name}</dd>
          <dt>Email</dt><dd>{user.email}</dd>
          <dt>Phone</dt><dd>{user.phone}</dd>
          <dt>Role</dt><dd>{user.role}</dd>
        </dl>
      </div>

      {/* Password change */}
      <div className="card">
        <h2 style={{ fontSize: "1rem", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="lock" size={18} />
          Password
        </h2>
        <p className="muted small" style={{ marginBottom: 12 }}>
          Need to change your password? Head to the password settings page.
        </p>
        <Link href="/forgot-password" className="btn btn-ghost btn-sm">Change password</Link>
      </div>

      {user.role === "CUSTOMER" && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1rem", marginBottom: 8 }}>Delete account</h2>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Permanently removes your account, vehicles and service history. Not possible while a service is open or a bill is unpaid.
          </p>
          <DeleteAccount />
        </div>
      )}
    </div>
  );
}
