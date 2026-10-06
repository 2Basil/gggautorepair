import "./globals.css";
import AmbientBG from "@/components/AmbientBG";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { GARAGE } from "@/lib/config";

export const metadata = {
  title: `${GARAGE.name} — car service, repair, washing & more`,
  description: GARAGE.tagline,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AmbientBG />
        <div className="shell">
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
