import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@vdmnexus/ui/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "De Parmentier — AI-Powered Gebouwbeheer",
  description:
    "Ontdek hoe AI agents receptie, onderhoud en communicatie automatiseren voor De Parmentier.",
  openGraph: {
    title: "De Parmentier — AI-Powered Gebouwbeheer",
    description:
      "Ontdek hoe AI agents gebouwbeheer automatiseren.",
    url: "https://deparmentier.vdmnexus.com",
    siteName: "De Parmentier | VDM Nexus",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
