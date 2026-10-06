import OwnerJoinForm from "./OwnerJoinForm";

export default function OwnerJoin() {
  return (
    <div className="container page">
      <div className="auth-wrap" style={{ maxWidth: 480 }}>
        <span className="eyebrow">Owner access</span>
        <h1 style={{ fontSize: "2.1rem" }}>Join as garage owner</h1>
        <p className="muted">Enter the owner access code you were given. Existing customers can upgrade their account with their current password.</p>
        <OwnerJoinForm />
      </div>
    </div>
  );
}
