import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VDM Nexus — Cryptographically receipted AI inference",
  description:
    "AI inference with signed receipts. Every request signed by an agent keypair, every response carries cryptographic proof of cost, balance, and content hashes. No API keys.",
  metadataBase: new URL("https://vdmnexus.com"),
  openGraph: {
    title: "VDM Nexus — Cryptographically receipted AI inference",
    description:
      "AI inference with signed receipts. Solana-keypair agent identity, USDC-settled compute, append-only ledger. Live on devnet.",
    url: "https://vdmnexus.com",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VDM Nexus",
    description: "AI inference with signed receipts. No API keys.",
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
