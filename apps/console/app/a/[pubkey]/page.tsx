import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AgentProfileView } from "@/components/agent-profile-view";
import { loadAgentProfile, PUBKEY_REGEX } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function truncatePubkey(pubkey: string): string {
  if (pubkey.length <= 12) return pubkey;
  return `${pubkey.slice(0, 6)}…${pubkey.slice(-4)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}): Promise<Metadata> {
  const { pubkey } = await params;
  if (!PUBKEY_REGEX.test(pubkey)) {
    return { title: "Agent not found — VDM Nexus", robots: { index: false } };
  }
  const short = truncatePubkey(pubkey);
  const title = `Agent ${short} — Mission Control`;
  const description = `Public profile for agent ${short}. Receipts, USDC spent, reputation. Signed inferences on the VDM Nexus rail.`;
  return {
    title,
    description,
    alternates: { canonical: `https://console.vdmnexus.com/a/${pubkey}` },
    openGraph: {
      title,
      description,
      url: `https://console.vdmnexus.com/a/${pubkey}`,
      siteName: "VDM Nexus",
      type: "profile",
    },
    twitter: {
      card: "summary",
      site: "@vdmnexus",
      title,
      description,
    },
  };
}

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}) {
  const { pubkey } = await params;
  if (!PUBKEY_REGEX.test(pubkey)) notFound();

  const data = await loadAgentProfile(pubkey);
  if (!data) notFound();

  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />
      <AgentProfileView data={data} />
      <Footer />
    </main>
  );
}
