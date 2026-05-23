import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AgentProfileView } from "@/components/agent-profile-view";
import { SignOutButton } from "@/components/sign-out-button";
import { loadAgentProfile } from "@/lib/agent";
import { getSessionPubkey, isSessionConfigured } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard — Mission Control",
  description: "Your private VDM Nexus agent dashboard.",
  robots: { index: false },
};

export default async function DashboardPage() {
  // If the HMAC key isn't set we can't honour any session cookie —
  // punt to /sign-in, which renders its own "being configured" notice
  // in that case.
  if (!isSessionConfigured()) redirect("/sign-in");

  const pubkey = await getSessionPubkey();
  if (!pubkey) redirect("/sign-in");

  const data = await loadAgentProfile(pubkey);

  if (!data) {
    return (
      <main className="relative min-h-screen">
        <Nav />
        <section className="relative mx-auto w-full max-w-md px-6 pt-20 pb-16">
          <h1 className="text-2xl font-semibold text-text">
            No activity yet.
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            We don't have any signed inferences for{" "}
            <code className="break-all font-mono text-[11px] text-text">
              {pubkey}
            </code>{" "}
            yet. Make one signed call against{" "}
            <code className="rounded bg-bg/60 px-1 py-0.5 font-mono text-[11px] text-text">
              nexus.vdmnexus.com
            </code>{" "}
            and refresh.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/sign-in"
              className="rounded-md border border-soft bg-surface/60 px-3 py-1.5 text-xs text-text-muted hover:text-text"
            >
              Sign in as another agent
            </Link>
            <SignOutButton />
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />
      <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-2 px-6 pt-6">
        <Link
          href={`/a/${pubkey}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-soft bg-surface/60 px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
        >
          View public profile
        </Link>
        <SignOutButton />
      </div>
      <AgentProfileView data={data} authenticated />
      <Footer />
    </main>
  );
}
