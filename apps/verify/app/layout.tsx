import type { Metadata } from "next";
import type { ReactNode } from "react";

import { StatusStrip } from "@/components/status-strip";

import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus Verify — verify a signed inference receipt",
  description:
    "Hosted verifier for VDM Nexus SIR v2 receipts. Drop in a receipt URL or ID, get the five-check verification result. Same code path as @vdm-nexus/x402.",
  alternates: { canonical: "https://verify.vdmnexus.com" },
  openGraph: {
    title: "Nexus Verify",
    description:
      "Hosted verifier for VDM Nexus signed inference receipts. Five cryptographic checks, multi-chain.",
    url: "https://verify.vdmnexus.com",
    siteName: "Nexus Verify",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vdmnexus",
    creator: "@vdmnexus",
    title: "Nexus Verify",
    description:
      "Hosted verifier for VDM Nexus signed inference receipts.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StatusStrip />
        {children}
      </body>
    </html>
  );
}
