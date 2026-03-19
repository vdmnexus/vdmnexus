import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@vdmnexus/ui/globals.css";
import { Topbar } from "./_components/topbar";
import { AgentTerminal } from "./_components/agent-terminal";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "VDM Vastgoed — Dashboard",
  description:
    "Beheer uw vastgoedportefeuille met Van der Meulen Vastgoed.",
  openGraph: {
    title: "VDM Vastgoed — Dashboard",
    description: "Vastgoedbeheer dashboard powered by VDM Nexus.",
    url: "https://vdmvastgoed.vdmnexus.com",
    siteName: "VDM Vastgoed | VDM Nexus",
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
      <body className="font-sans bg-primary-50">
        <div className="flex flex-col h-screen">
          <Topbar />
          <main className="flex-1 overflow-hidden pb-10">{children}</main>
          <AgentTerminal />
        </div>
      </body>
    </html>
  );
}
