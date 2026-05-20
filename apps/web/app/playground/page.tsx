import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GridBg } from "@/components/grid-bg";
import { SectionEyebrow } from "@/components/section";
import { FadeIn } from "@/components/fade-in";
import { PlaygroundConsole } from "@/components/playground/console";

export const metadata: Metadata = {
  title: "Playground — VDM Nexus",
  description:
    "Live signed-inference demo. Every call is signed by the VDM Nexus operator key, paid via x402, and emits a receipt anyone can verify.",
};

export default function PlaygroundPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-6xl px-6 pb-12 pt-20 sm:pb-16 sm:pt-28">
            <FadeIn className="max-w-3xl">
              <SectionEyebrow>Live demo</SectionEyebrow>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl">
                Try <span className="text-gradient">signed inference</span>
              </h1>
              <p className="mt-5 max-w-2xl text-balance text-base leading-relaxed text-text-muted sm:text-lg">
                Every call below is signed by VDM Nexus&apos;s operator key
                and pays for itself via the x402 payment rail. Verify any
                receipt yourself.
              </p>
            </FadeIn>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-24 sm:pb-32">
          <PlaygroundConsole />
        </section>
      </main>
      <Footer />
    </>
  );
}
