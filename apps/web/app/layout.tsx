import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VDM Nexus — The infrastructure layer for autonomous AI",
  description:
    "VDM Nexus routes AI compute intelligently, accepts crypto-native payments, and gives autonomous agents the infrastructure they need to operate independently.",
  metadataBase: new URL("https://vdmnexus.com"),
  openGraph: {
    title: "VDM Nexus — The infrastructure layer for autonomous AI",
    description:
      "Smart compute routing for AI businesses. Crypto-native payments for autonomous agents. One endpoint, full control.",
    url: "https://vdmnexus.com",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VDM Nexus",
    description: "The infrastructure layer for autonomous AI.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
