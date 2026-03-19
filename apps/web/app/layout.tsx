import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@vdmnexus/ui/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "VDM Nexus — AI Employee Platform",
  description:
    "Bouw, configureer en run AI employees met custom skills, geheugen en persoonlijkheid. VDM Nexus is de runtime voor jouw AI workforce.",
  openGraph: {
    title: "VDM Nexus — AI Employee Platform",
    description:
      "Build AI Employees for Your Business. Custom skills, soul memory, any LLM.",
    url: "https://vdmnexus.com",
    siteName: "VDM Nexus",
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
