"use client";

import { useEffect, useState } from "react";

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    // Check if dismissed previously in session
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem("pwa_prompt_dismissed");
      if (dismissed) setIsDismissed(true);

      // Check if already installed / standalone mode
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
      if (isStandalone) setIsInstalled(true);

      // Simple mobile detection
      const ua = navigator.userAgent || "";
      const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
      setIsMobileDevice(isMobile);

      // PWA install event listener
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, []);

  async function handleInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Guide instructions for Android / iOS browsers
      alert(
        "To install Pitstop on your phone:\n\n" +
          "• Android (Chrome): Tap the 3 dots (⋮) in the top right → tap 'Install app' or 'Add to Home screen'.\n" +
          "• iPhone (Safari): Tap the Share button (⎋) → tap 'Add to Home Screen'."
      );
    }
  }

  function handleDismiss() {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pwa_prompt_dismissed", "true");
    }
  }

  // Only show if not installed, not dismissed, and on mobile or has install prompt
  if (isInstalled || isDismissed || (!deferredPrompt && !isMobileDevice)) {
    return null;
  }

  return (
    <div
      className="no-print"
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: 440,
        zIndex: 9999,
        background: "rgba(24, 28, 36, 0.96)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1.5px solid rgba(200, 168, 107, 0.35)",
        borderRadius: 20,
        padding: "12px 14px",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45), 0 0 20px rgba(200, 69, 43, 0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        animation: "pwaSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {/* App Icon */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "linear-gradient(135deg, #1e2430, #0f1218)",
            border: "1.5px solid #c8a86b",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <span style={{ fontSize: "1.3rem" }}>🏎️</span>
        </div>

        {/* Text */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: "0.88rem",
              color: "#f7f1e3",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Pitstop Garage App
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "#c8a86b",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            1-tap tracking & bill payments
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleInstallClick}
          style={{
            background: "linear-gradient(135deg, #c8452b, #a93720)",
            color: "#ffffff",
            border: "none",
            borderRadius: 11,
            padding: "8px 14px",
            fontSize: "0.82rem",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(200, 69, 43, 0.4)",
            whiteSpace: "nowrap",
          }}
        >
          📲 Install App
        </button>

        <button
          onClick={handleDismiss}
          aria-label="Close"
          style={{
            background: "transparent",
            color: "#8b949e",
            border: "none",
            borderRadius: 8,
            width: 28,
            height: 28,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            fontSize: "1rem",
            padding: 0,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
