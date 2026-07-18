import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "2026 World Cup model — VDM Nexus",
    template: "%s — 2026 World Cup model",
  },
  description:
    "A calibrated Dixon-Coles + Monte-Carlo model for the 2026 World Cup: exact-scoreline picks for all 72 group fixtures, champion and advancement odds, group standings, and squad pages for all 48 nations.",
  metadataBase: new URL("https://wc.vdmnexus.com"),
  openGraph: {
    title: "2026 World Cup model",
    description:
      "Exact-scoreline picks, champion odds, and squads for the 2026 World Cup — from a calibrated Dixon-Coles core.",
    url: "https://wc.vdmnexus.com",
    siteName: "VDM Nexus · World Cup 2026",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "2026 World Cup model",
    description:
      "Exact-scoreline picks, champion odds, and squads for the 2026 World Cup.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-bg font-sans text-text antialiased">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
