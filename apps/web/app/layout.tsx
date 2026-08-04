import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/wallet/wallet-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Canonical brand line, verbatim, on every metadata surface: title, OG,
// Twitter. The supporting line follows it in each description. If you
// change the wording, change it here and in the two hero blocks
// (`app/page.tsx`, `app/rienda/page.tsx`) in the same commit.
export const metadata: Metadata = {
  title: "VDM Nexus — The model never holds the keys",
  description:
    "Agent vaults. Guardrails in the contract, not the prompt. Rienda is a self-custodial vault for LLM trading agents on Robinhood Chain — the vault holds the capital, the agent holds a session key that can trade and nothing else. In development, testnet first. Losses get bounded, not prevented.",
  metadataBase: new URL("https://vdmnexus.com"),
  // `app/icon.svg` and `app/apple-icon.tsx` are picked up by convention —
  // both render the VDM Nexus mark. No manual icons block needed.
  openGraph: {
    title: "VDM Nexus — The model never holds the keys",
    description:
      "Agent vaults. Guardrails in the contract, not the prompt. Contract-enforced limits, a signed receipt behind every decision. In development — testnet first.",
    url: "https://vdmnexus.com",
    siteName: "VDM Nexus",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "VDM Nexus — The model never holds the keys",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VDM Nexus — The model never holds the keys",
    description:
      "Agent vaults. Guardrails in the contract, not the prompt. Losses get bounded, not prevented.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-bg text-text antialiased">
        {/*
          Wallet context wraps the whole app so the nav's connect button
          works on every route. Children are passed as props, so pages
          below this boundary still render as server components.
        */}
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
