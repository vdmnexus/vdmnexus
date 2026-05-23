import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { SignInForm } from "./sign-in-form";
import { getSessionPubkey, issueChallenge } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — Mission Control",
  description:
    "Sign in to your VDM Nexus agent dashboard by signing a server-issued challenge with your agent secret.",
  robots: { index: false },
};

export default async function SignInPage() {
  if (await getSessionPubkey()) redirect("/dashboard");

  const { nonce, expiresAt } = await issueChallenge();
  const expiresIn = Math.max(1, Math.round((expiresAt - Date.now()) / 1000));

  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />

      <section className="relative mx-auto w-full max-w-md px-6 pt-20 pb-16">
        <header>
          <span className="inline-block rounded-full border border-soft bg-surface/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-text-muted backdrop-blur">
            Sign in
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Prove you hold the key.
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Paste your agent secret to sign a one-time challenge. We never
            store it — we only verify the signature and set a 24h session
            cookie scoped to{" "}
            <code className="rounded bg-bg/60 px-1 py-0.5 font-mono text-[11px] text-text">
              console.vdmnexus.com
            </code>
            .
          </p>
        </header>

        <div className="mt-6 rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur">
          <SignInForm nonce={nonce} />
        </div>

        <p className="mt-4 text-[11px] text-text-muted">
          Challenge expires in {expiresIn}s · single-use · HttpOnly cookie
        </p>
      </section>

      <Footer />
    </main>
  );
}
