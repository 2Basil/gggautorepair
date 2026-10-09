import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }) {
  const { next } = await searchParams;
  return (
    <div className="container page">
      <div className="auth-wrap" style={{ maxWidth: 440 }}>
        <span className="eyebrow">Welcome back</span>
        <h1 style={{ fontSize: "2.1rem" }}>Log in</h1>
        <LoginForm next={next || ""} />
      </div>
    </div>
  );
}
