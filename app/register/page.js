import Link from "next/link";
import RegisterForm from "./RegisterForm";
import { otpChannel } from "@/lib/otp";
import { REQUIRE_VERIFICATION } from "@/lib/settings";

export default function RegisterPage() {
  return (
    <div className="container page">
      <div className="auth-wrap" style={{ maxWidth: 680 }}>
        <span className="eyebrow">Step 1 of 2 · Create account</span>
        <h1 style={{ fontSize: "2.1rem" }}>Tell us about you and your car.</h1>
        <p className="muted">Your details first, then your vehicle for registration. It takes a minute.</p>
        <RegisterForm channel={otpChannel()} verify={REQUIRE_VERIFICATION} />
        <p className="muted small center" style={{ marginTop: 16 }}>
          Already registered? <Link href="/login" className="btn-link">Log in</Link>
        </p>
      </div>
    </div>
  );
}
