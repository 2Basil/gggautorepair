import { redirect } from "next/navigation";
import { getOnboardingSession, getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import OnboardingForm from "./OnboardingForm";

export const metadata = {
  title: "Complete Your Profile · Pitstop Garage",
  description: "Complete your personal and vehicle details to activate your account.",
};

export default async function OnboardingPage({ searchParams }) {
  const { step } = await searchParams;
  const onboardingSession = await getOnboardingSession();
  const loggedInUser = await getUser();

  // If user is already logged in, check their vehicle count
  if (loggedInUser) {
    const vehicleCount = await db.vehicle.count({ where: { userId: loggedInUser.id } });
    if (vehicleCount > 0) {
      redirect("/dashboard");
    }
  }

  // If neither an onboarding session nor a logged in user exists, send to login
  if (!onboardingSession && !loggedInUser) {
    redirect("/login");
  }

  const initialData = {
    name: onboardingSession?.name || loggedInUser?.name || "",
    email: onboardingSession?.email || loggedInUser?.email || "",
    picture: onboardingSession?.picture || null,
    phone: loggedInUser?.phone || "",
    city: loggedInUser?.city || "",
    address: loggedInUser?.address || "",
    username: loggedInUser?.username || "",
  };

  const initialStep = step === "vehicle" || (loggedInUser && loggedInUser.phone) ? 2 : 1;

  return (
    <div className="container page">
      <div className="auth-wrap" style={{ maxWidth: 680 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          {initialData.picture ? (
            <img
              src={initialData.picture}
              alt={initialData.name}
              style={{ width: 44, height: 44, borderRadius: "50%", border: "2px solid var(--accent)" }}
            />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--accent)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: "1.1rem",
              }}
            >
              {initialData.name.charAt(0).toUpperCase() || "G"}
            </div>
          )}
          <div>
            <span className="eyebrow" style={{ marginBottom: 0 }}>Almost ready</span>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{initialData.name}</div>
          </div>
        </div>

        <h1 style={{ fontSize: "2.1rem" }}>Welcome! Let&apos;s complete your setup.</h1>
        <p className="muted">
          Your Google account ({initialData.email}) is connected. Now tell us your contact info and vehicle details so we can manage your services and bookings.
        </p>

        <OnboardingForm initialData={initialData} initialStep={initialStep} />
      </div>
    </div>
  );
}
