import Link from "next/link";
import { GARAGE } from "@/lib/config";

export const metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <div className="container page" style={{ maxWidth: 760 }}>
      <span className="eyebrow">Legal</span>
      <h1>Privacy Policy</h1>
      <p className="muted small">Last updated: October 2026. This is a general template; have it reviewed for your business and location.</p>
      <div className="stack" style={{ gap: 14 }}>
        <p><b>What we collect.</b> Your name, email, phone number, address (optional), vehicle details, service requests, bills and payment status. If you sign in with Google we receive your name and verified email address.</p>
        <p><b>Why.</b> To book and carry out services, send estimates, bills and status updates, take payment, and keep service history for you and the garage.</p>
        <p><b>Who sees it.</b> Garage staff see your account, vehicles and jobs. Our service providers process data on our behalf: hosting (Vercel), database (Turso), email delivery, and Stripe for card payments. We do not sell your data.</p>
        <p><b>Payments.</b> Card details are entered on Stripe’s page and never reach our servers.</p>
        <p><b>Cookies.</b> We use one essential cookie to keep you signed in. No advertising or tracking cookies.</p>
        <p><b>Your choices.</b> You can edit your vehicles and username, and delete your account from your Profile page (once no service is open and no bill is unpaid). Contact us to correct or export your data.</p>
        <p><b>Retention.</b> Records are kept while your account exists; deleting your account removes your profile, vehicles and history, except what the law requires us to keep.</p>
        <p><b>Contact.</b> {GARAGE.email} · {GARAGE.phone}</p>
      </div>
      <p style={{ marginTop: 24 }}><Link href="/terms" className="btn btn-ghost btn-sm">Terms of Service →</Link></p>
    </div>
  );
}
