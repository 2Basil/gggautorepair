import Link from "next/link";
import { GARAGE } from "@/lib/config";

export const metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <div className="container page" style={{ maxWidth: 760 }}>
      <span className="eyebrow">Legal</span>
      <h1>Terms of Service</h1>
      <p className="muted small">Last updated: October 2026. This is a general template; have it reviewed for your business and location.</p>
      <div className="stack" style={{ gap: 14 }}>
        <p><b>1. Who we are.</b> {GARAGE.name} (“we”) provides vehicle repair and maintenance services and this website to manage requests, estimates, bills and payments.</p>
        <p><b>2. Your account.</b> You are responsible for the accuracy of the details you give and for keeping your password private. Tell us if you think your account was used without permission.</p>
        <p><b>3. Estimates.</b> An estimate is our best assessment before inspection. The final price may change if more work is found to be necessary; we will tell you before doing extra work.</p>
        <p><b>4. Bills and payment.</b> Bills are due when issued unless agreed otherwise. Online card payments are processed by Stripe; we never see or store your card number. Payments made by other methods are confirmed by our staff.</p>
        <p><b>5. Cancellations.</b> You can cancel or reschedule a service before work starts. Work already carried out and parts already ordered may be charged.</p>
        <p><b>6. Workmanship.</b> We stand behind our work as described on your invoice. We are not liable for pre-existing faults or for parts supplied by you.</p>
        <p><b>7. Acceptable use.</b> Do not misuse the site, attempt to access other people’s data, or submit false information.</p>
        <p><b>8. Changes.</b> We may update these terms; continued use means you accept the updated terms.</p>
        <p><b>9. Contact.</b> {GARAGE.email} · {GARAGE.phone}</p>
      </div>
      <p style={{ marginTop: 24 }}><Link href="/privacy" className="btn btn-ghost btn-sm">Privacy Policy →</Link></p>
    </div>
  );
}
