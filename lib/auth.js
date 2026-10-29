import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { getSecret } from "./secret";

const COOKIE = "session";
const secret = getSecret;

export async function createSession(user) {
  const token = await new SignJWT({ uid: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return await db.user.findUnique({
      where: { id: Number(payload.uid) },
      select: { id: true, name: true, email: true, phone: true, userCode: true, username: true, empId: true, role: true },
    });
  } catch {
    return null;
  }
}

export async function requireUser(next = "/dashboard") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

// Owner or employee (the garage staff)
export async function requireStaff() {
  const user = await getUser();
  if (!user) redirect(`/login?next=/owner`);
  if (user.role !== "OWNER" && user.role !== "EMPLOYEE") redirect("/dashboard");
  return user;
}

export async function requireOwner() {
  const user = await getUser();
  if (!user) redirect(`/login?next=/owner`);
  if (user.role !== "OWNER") redirect("/dashboard");
  return user;
}

const ONBOARDING_COOKIE = "onboarding_session";

export async function createOnboardingSession(profile) {
  const token = await new SignJWT({
    email: profile.email,
    name: profile.name,
    picture: profile.picture || null,
    googleId: profile.googleId || profile.sub || null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(secret());

  (await cookies()).set(ONBOARDING_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });
}

export async function getOnboardingSession() {
  const token = (await cookies()).get(ONBOARDING_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      googleId: payload.googleId,
    };
  } catch {
    return null;
  }
}

export async function destroyOnboardingSession() {
  (await cookies()).delete(ONBOARDING_COOKIE);
}
