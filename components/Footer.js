"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GARAGE } from "@/lib/config";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/owner")) return null;

  return (
    <footer className="site-footer">
      <div className="container footer-row">
        <div>
          <strong>{GARAGE.name}</strong>
          <p className="muted">{GARAGE.tagline}</p>
        </div>
        <div className="muted small">
          <div>{GARAGE.address}</div>
          <div>{GARAGE.phone} · {GARAGE.email}</div>
          <div>{GARAGE.hours}</div>
        </div>
        <div className="footer-links small">
          <Link href="/plans">Plans</Link>
          <Link href="/book">Get an estimate</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/owner">Owner portal</Link>
        </div>
      </div>
    </footer>
  );
}
