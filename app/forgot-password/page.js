import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = {
  title: "Forgot Password — ZZZ Auto Garage",
  description: "Reset your password by verifying your email address.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="container page">
      <div className="auth-wrap" style={{ maxWidth: 440 }}>
        <span className="eyebrow">Account Recovery</span>
        <h1 style={{ fontSize: "2.1rem" }}>Forgot Password</h1>
        <p className="muted small" style={{ marginBottom: 20 }}>
          Enter your email address and we&apos;ll send you a verification code to reset your password.
        </p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
