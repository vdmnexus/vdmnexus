import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GridBg } from "@/components/grid-bg";
import { SectionEyebrow } from "@/components/section";
import { AnimatedLogo } from "@/components/animated-logo";

export const metadata: Metadata = {
  title: "Brand — VDM Nexus",
  description:
    "VDM Nexus brand assets — animated logo, color tokens, and the signed-inference signature motion.",
};

export default function BrandPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-20 sm:pb-24 sm:pt-28">
            <SectionEyebrow>Brand</SectionEyebrow>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl">
              The <span className="text-gradient">signed inference</span> mark
            </h1>
            <p className="mt-5 max-w-2xl text-balance text-base leading-relaxed text-text-muted sm:text-lg">
              An indigo signature stroke is drawn beneath the wordmark on every
              brand render. It&apos;s the visual cue tied to the locked
              vocabulary — every receipt VDM Nexus emits is a literal signature.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-24 sm:pb-32">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-soft bg-surface p-12">
              <span className="mb-8 text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
                Mark — large
              </span>
              <AnimatedLogo size={280} />
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-soft bg-surface p-12">
              <span className="mb-8 text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
                Mark — small
              </span>
              <AnimatedLogo size={160} />
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-soft bg-bg p-12">
              <span className="mb-8 text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
                On page background
              </span>
              <AnimatedLogo size={200} />
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-soft bg-surface p-12">
              <span className="mb-8 text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
                Mark only, no tagline
              </span>
              <AnimatedLogo size={200} withTagline={false} />
            </div>
          </div>

          <div className="mt-16 rounded-2xl border border-soft bg-surface p-8 sm:p-10">
            <h2 className="text-xl font-semibold text-text">Usage</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              <code className="rounded bg-bg px-1.5 py-0.5 text-text">
                {`<AnimatedLogo size={240} />`}
              </code>
              {" "}
              drops in anywhere on the marketing site. The motion replays once on mount; pass
              {" "}
              <code className="rounded bg-bg px-1.5 py-0.5 text-text">
                replayKey
              </code>
              {" "}
              when you want to restart it (e.g. tied to a hero CTA or a scroll-into-view event).
              The animation respects{" "}
              <code className="rounded bg-bg px-1.5 py-0.5 text-text">
                prefers-reduced-motion
              </code>
              ; users with that preference see the static brand mark.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
