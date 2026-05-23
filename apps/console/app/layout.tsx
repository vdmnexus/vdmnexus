import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mission Control — VDM Nexus",
  description:
    "Per-agent home on the VDM Nexus signed-inference rail. Public profile + private dashboard.",
  metadataBase: new URL("https://console.vdmnexus.com"),
  openGraph: {
    title: "Mission Control — VDM Nexus",
    description:
      "Per-agent home on the signed-inference rail. Receipts, balance, reputation.",
    url: "https://console.vdmnexus.com",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vdmnexus",
    title: "Mission Control — VDM Nexus",
    description: "Per-agent home on the signed-inference rail.",
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
