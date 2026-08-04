import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GridBg } from "@/components/grid-bg";
import { SectionEyebrow } from "@/components/section";
import { FadeIn } from "@/components/fade-in";
import { VaultDashboard } from "@/components/wallet/vault-dashboard";

export const metadata: Metadata = {
  title: "Vault — VDM Nexus",
  description:
    "The model never holds the keys. Connect a wallet to VDM Nexus — the Rienda vault dashboard shows connected state today; vault creation opens with the Robinhood Chain testnet deploy.",
  alternates: { canonical: "https://vdmnexus.com/app" },
  // Nothing to index: the page is a connect surface with an empty state.
  robots: { index: false, follow: true },
};

export default function AppPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-4xl px-6 pb-20 pt-20 sm:pb-24 sm:pt-28">
            <FadeIn>
              <div className="flex flex-wrap items-center gap-3">
                <SectionEyebrow>Rienda</SectionEyebrow>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300">
                  In development · testnet first
                </span>
              </div>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl">
                Your vault
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-text-muted">
                Self-custodial. The wallet you connect stays yours — VDM Nexus
                never holds a key, and this page never asks you to sign
                anything. Read-only until the vault contracts deploy.
              </p>
            </FadeIn>
            <FadeIn delay={0.06} className="mt-10">
              <VaultDashboard />
            </FadeIn>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
