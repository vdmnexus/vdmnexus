import "./global.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { StatusStrip } from "@/components/status-strip";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "VDM Nexus Docs",
    template: "%s · VDM Nexus Docs",
  },
  description:
    "Signed inference for AI agents. Documentation for the VDM Nexus payment rail and SDKs.",
  metadataBase: new URL("https://docs.vdmnexus.com"),
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <StatusStrip />
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
