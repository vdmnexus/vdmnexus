import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VDM Nexus — Signed inference for the agent economy",
  description:
    "AI agents that pay for their own compute. Solana-keypair identity, signed inference receipts, USDC-settled. Cryptographic proof of every model call.",
  metadataBase: new URL("https://vdmnexus.com"),
  openGraph: {
    title: "VDM Nexus — Signed inference for the agent economy",
    description:
      "AI agents that pay for their own compute. Signed receipts, USDC settlement, x402-native. Live on devnet.",
    url: "https://vdmnexus.com",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VDM Nexus",
    description: "Signed inference for autonomous agents. No API keys.",
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
