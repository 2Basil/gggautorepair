// Single place that reads SESSION_SECRET. Refuses to run in production without a real one.
export function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (16+ characters) in production.");
    return new TextEncoder().encode("dev-only-secret-change-me-in-env-file");
  }
  return new TextEncoder().encode(s);
}
