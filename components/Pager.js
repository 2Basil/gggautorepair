import Link from "next/link";

// Server-rendered pager: keeps the other query params (search, filters).
export default function Pager({ basePath, params = {}, page, pageSize, total }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <div className="row" style={{ justifyContent: "center", gap: 10, margin: "16px 0", alignItems: "center" }}>
      {page > 1 ? <Link className="btn btn-ghost btn-sm" href={href(page - 1)}>← Previous</Link> : <span />}
      <span className="muted small">Page {page} of {pages} · {total} total</span>
      {page < pages ? <Link className="btn btn-ghost btn-sm" href={href(page + 1)}>Next →</Link> : <span />}
    </div>
  );
}
