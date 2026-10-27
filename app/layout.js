import "./globals.css";
import AmbientBG from "@/components/AmbientBG";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InstallAppPrompt from "@/components/InstallAppPrompt";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import { GARAGE } from "@/lib/config";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#22262e",
};

export const metadata = {
  title: `${GARAGE.name} — car service, repair, washing & more`,
  description: GARAGE.tagline,
  applicationName: GARAGE.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: GARAGE.name,
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/app/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SW registered:', reg.scope);
                  }).catch(function(err) {
                    console.warn('SW failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <AmbientBG />
        <div className="shell">
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
        <InstallAppPrompt />
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
