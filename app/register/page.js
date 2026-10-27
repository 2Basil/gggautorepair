import Link from "next/link";
import RegisterForm from "./RegisterForm";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { otpChannel } from "@/lib/otp";
import { REQUIRE_VERIFICATION } from "@/lib/settings";

export default function RegisterPage() {
  return (
    <div className="container page">
      <div className="auth-wrap" style={{ maxWidth: 680 }}>
        <span className="eyebrow">Step 1 of 2 · Create account</span>
        <h1 style={{ fontSize: "2.1rem" }}>Tell us about you and your car.</h1>
        <p className="muted">Your details first, then your vehicle for registration. It takes a minute.</p>

        <div style={{ marginBottom: 20 }}>
          <GoogleSignInButton label="Sign up with Google (Fast &amp; Easy)" />
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--line, #e2e8f0)" }} />
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--muted, #64748b)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              or fill details manually
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--line, #e2e8f0)" }} />
          </div>
        </div>

        <RegisterForm channel={otpChannel()} verify={REQUIRE_VERIFICATION} />
        <p className="muted small center" style={{ marginTop: 16 }}>
          Already registered? <Link href="/login" className="btn-link">Log in</Link>
        </p>
      </div>
    </div>
  );
}
