import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { CookieConsent } from "@/components/CookieConsent";
import { MiniPlayerProvider } from "@/lib/MiniPlayerContext";
import { FloatingMiniPlayer } from "@/components/FloatingMiniPlayer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OmniDiscover — All-in-One Content Discovery Platform",
  description: "Discover educational lectures, music, movies, gaming, technology, sports, and news through a unified, secure discovery architecture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("platform_theme");if(t==="light"){document.documentElement.setAttribute("data-theme","light");}else{document.documentElement.removeAttribute("data-theme");}}catch(e){}})();`,
          }}
        />
      </head>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <ThemeProvider>
          <LanguageProvider>
            <MiniPlayerProvider>
              <Navbar />
              <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {children}
              </main>
              <Footer />
              <FloatingMiniPlayer />
              <CookieConsent />
            </MiniPlayerProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
