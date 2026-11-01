import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { baseUrl } from "@/lib/baseUrl";
import { createSession, createOnboardingSession } from "@/lib/auth";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateStr = searchParams.get("state");
  const mock = searchParams.get("mock");
  const siteUrl = await baseUrl();
  const redirectUri = `${siteUrl}/api/auth/google/callback`;

  const isProd = process.env.NODE_ENV === "production";
  const mockAllowed = !isProd && mock === "1";
  const cookieNonce = request.cookies.get("g_state")?.value;

  let next = "/dashboard";
  let stateNonce = null;
  if (stateStr) {
    try {
      const stateObj = JSON.parse(Buffer.from(stateStr, "base64url").toString("utf-8"));
      stateNonce = stateObj.nonce || null;
      if (stateObj.next && stateObj.next.startsWith("/") && !stateObj.next.startsWith("//")) next = stateObj.next;
    } catch {
      // ignore state parse errors
    }
  }

  if (!mockAllowed && (!cookieNonce || !stateNonce || cookieNonce !== stateNonce)) {
    return NextResponse.redirect(`${siteUrl}/login?error=Google sign-in expired. Please try again.`);
  }

  let profile = null;

  // Mock / Dev Fallback when keys are not configured yet
  if (mockAllowed) {
    profile = {
      email: "alex.taylor@gmail.com",
      name: "Alex Taylor",
      sub: "mock_google_user_01",
      picture: "https://lh3.googleusercontent.com/a/default-user",
    };
  } else {
    if (!code) {
      return NextResponse.redirect(`${siteUrl}/login?error=Google sign-in was cancelled.`);
    }

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        console.error("Google token error:", await tokenRes.text());
        return NextResponse.redirect(`${siteUrl}/login?error=Failed to authenticate with Google.`);
      }

      const tokens = await tokenRes.json();
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userinfoRes.ok) {
        return NextResponse.redirect(`${siteUrl}/login?error=Failed to fetch Google profile.`);
      }

      profile = await userinfoRes.json();
      if (profile.email_verified !== true && profile.email_verified !== "true") {
        return NextResponse.redirect(`${siteUrl}/login?error=Your Google email is not verified.`);
      }
    } catch (err) {
      console.error("Google OAuth error:", err);
      return NextResponse.redirect(`${siteUrl}/login?error=An unexpected error occurred during Google sign-in.`);
    }
  }

  if (!profile || !profile.email) {
    return NextResponse.redirect(`${siteUrl}/login?error=Could not retrieve email from Google.`);
  }

  const email = String(profile.email).toLowerCase().trim();

  // Check if account already exists
  const existingUser = await db.user.findUnique({
    where: { email },
    include: { vehicles: { select: { id: true } } },
  });

  if (existingUser) {
    // Staff accounts must use email/ID + password; never Google.
    if (existingUser.role !== "CUSTOMER") {
      return NextResponse.redirect(`${siteUrl}/login?error=Staff accounts must sign in with email and password.`);
    }
    await createSession(existingUser);

    // If user already has a vehicle registered, proceed to dashboard
    if (existingUser.vehicles && existingUser.vehicles.length > 0) {
      return NextResponse.redirect(`${siteUrl}${next}`);
    }

    // Existing user but missing vehicle details: send to vehicle step
    return NextResponse.redirect(`${siteUrl}/onboarding?step=vehicle`);
  }

  // New Google user: store temporary onboarding session and redirect to complete info & vehicle
  await createOnboardingSession({
    email,
    name: profile.name || email.split("@")[0],
    picture: profile.picture || null,
    googleId: profile.sub || null,
  });

  const res = NextResponse.redirect(`${siteUrl}/onboarding`);
  res.cookies.delete("g_state");
  return res;
}
