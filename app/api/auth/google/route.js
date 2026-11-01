import { NextResponse } from "next/server";
import { baseUrl } from "@/lib/baseUrl";
import { randomBytes } from "crypto";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") || "";
  const mock = searchParams.get("mock") === "true";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const siteUrl = await baseUrl();
  const redirectUri = `${siteUrl}/api/auth/google/callback`;

  // If mock mode is requested or Google OAuth credentials are not yet configured in .env,
  // we provide a demo Google profile for seamless local development & testing.
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && (!clientId || mock)) {
    return NextResponse.redirect(`${siteUrl}/login?error=Google sign-in is not available.`);
  }
  if (!clientId || mock) {
    if (!clientId && !mock) {
      // In dev without keys, redirect to callback in mock mode with a prompt
      const callbackWithMock = new URL(`${siteUrl}/api/auth/google/callback`);
      callbackWithMock.searchParams.set("mock", "1");
      if (next) callbackWithMock.searchParams.set("next", next);
      return NextResponse.redirect(callbackWithMock);
    }
  }

  // CSRF protection: random nonce in state, mirrored in a short-lived httpOnly cookie
  const nonce = randomBytes(16).toString("hex");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";
  const state = Buffer.from(JSON.stringify({ next: safeNext, nonce })).toString("base64url");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(googleAuthUrl);
  res.cookies.set("g_state", nonce, {
    httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: 600,
  });
  return res;
}
