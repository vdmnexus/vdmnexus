import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GridBg } from "@/components/grid-bg";
import { SectionEyebrow } from "@/components/section";
import { AnimatedLogo } from "@/components/animated-logo";
import { Lockup, Mark } from "@/components/mark";

export const metadata: Metadata = {
  title: "Brand — VDM Nexus",
  description:
    "The VDM Nexus mark: two guardrails, a tensioned line, a node ring. Every stroke is currentColor. Clear space, sizing, and where the mark is used.",
};

const FILES: Array<{ path: string; what: string }> = [
  {
    path: "components/mark.tsx",
    what: "React source. <Mark /> and <Lockup />. Strokes are currentColor.",
  },
  {
    path: "public/mark.svg",
    what: "Standalone SVG for anything outside React — decks, emails, third-party embeds.",
  },
  {
    path: "app/icon.svg",
    what: "Favicon. Same geometry with literal colours, because a favicon has no parent to inherit from.",
  },
  {
    path: "app/apple-icon.tsx",
    what: "180×180 PNG for iOS home screens, generated from the same paths.",
  },
];

export default function BrandPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20 sm:pb-20 sm:pt-28">
            <SectionEyebrow>Brand</SectionEyebrow>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl">
              Two guardrails, a line under tension, and the{" "}
              <span className="text-gradient">node where it&apos;s signed</span>
            </h1>
            <p className="mt-5 max-w-2xl text-balance text-base leading-relaxed text-text-muted sm:text-lg">
              The mark draws the product. The two vertical bars are the limits
              the agent operates between. The line running between them is the
              rein — under tension, never slack. The ring at the centre is
              where the decision happens and where it gets signed.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-24 sm:pb-32">
          {/* Colour inheritance — the whole point of the mark. */}
          <h2 className="text-xl font-semibold text-text">
            One mark, whatever colour it lands in
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
            Every stroke is{" "}
            <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-[12px] text-text">
              currentColor
            </code>
            . There is no light build and no dark build — set the colour on
            the parent and the mark follows. Never hard-code a stroke on it.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "text-text", cls: "text-text", bg: "bg-surface" },
              {
                label: "text-text-muted",
                cls: "text-text-muted",
                bg: "bg-surface",
              },
              {
                label: "text-accent-indigo",
                cls: "text-accent-indigo",
                bg: "bg-surface",
              },
              { label: "on page bg", cls: "text-text", bg: "bg-bg" },
            ].map((swatch) => (
              <div
                key={swatch.label}
                className={`flex flex-col items-center gap-5 rounded-2xl border border-soft p-7 ${swatch.bg}`}
              >
                <Mark className={`h-14 w-14 ${swatch.cls}`} />
                <code className="font-mono text-[11px] text-text-muted">
                  {swatch.label}
                </code>
              </div>
            ))}
          </div>

          {/* Lockup + clear space. */}
          <h2 className="mt-16 text-xl font-semibold text-text">
            The lockup
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
            Mark plus wordmark. The wordmark is HTML text — never baked into
            the SVG — so it stays selectable, scales with the type ramp, and
            picks up Inter like the rest of the page.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-center rounded-2xl border border-soft bg-surface p-10">
              <Lockup
                className="text-text"
                markClassName="h-10 w-10"
                wordClassName="text-2xl"
              />
            </div>
            <div className="rounded-2xl border border-soft bg-surface p-10">
              {/*
                Clear space rule made visible: the dashed box sits half a
                mark-height out from the lockup on every side. Nothing else
                enters that box.
              */}
              <div className="flex items-center justify-center rounded-lg border border-dashed border-accent-indigo/40 p-[1.25rem]">
                <Lockup
                  className="text-text"
                  markClassName="h-10 w-10"
                  wordClassName="text-2xl"
                />
              </div>
              <p className="mt-5 text-xs leading-relaxed text-text-muted">
                Clear space: half the mark&apos;s height on every side. At the
                nav&apos;s 28px mark that&apos;s 14px — nothing crowds it
                closer, including the beta pill.
              </p>
            </div>
          </div>

          {/* Motion. */}
          <h2 className="mt-16 text-xl font-semibold text-text">Motion</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
            <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-[12px] text-text">
              {`<AnimatedLogo size={240} />`}
            </code>{" "}
            draws the mark in sequence — guardrails, then the rein, then the
            ring. Pass{" "}
            <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-[12px] text-text">
              replayKey
            </code>{" "}
            to restart it. Under{" "}
            <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-[12px] text-text">
              prefers-reduced-motion
            </code>{" "}
            it renders the finished mark with no animation at all.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-center rounded-2xl border border-soft bg-surface p-12 text-text">
              <AnimatedLogo size={200} />
            </div>
            <div className="flex items-center justify-center rounded-2xl border border-soft bg-bg p-12 text-accent-indigo">
              <AnimatedLogo size={140} withTagline={false} />
            </div>
          </div>

          {/* Where the files live. */}
          <h2 className="mt-16 text-xl font-semibold text-text">Files</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
            Four copies of the same geometry, each for a context that
            can&apos;t use the others. Change one path, change all four.
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-soft bg-surface">
            {FILES.map((f) => (
              <div
                key={f.path}
                className="flex flex-col gap-1 border-b border-soft px-5 py-4 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <code className="font-mono text-xs text-text sm:w-56 sm:flex-none">
                  {f.path}
                </code>
                <span className="text-sm text-text-muted">{f.what}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-text-muted">
            The previous wordmark lives at{" "}
            <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-[12px] text-text">
              public/logo-legacy.svg
            </code>{" "}
            and{" "}
            <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-[12px] text-text">
              public/logo.png
            </code>
            . Nothing on the site renders them; the PNG stays at its old path
            because the waitlist confirmation email still points at it.
          </p>

          {/* Colour tokens. */}
          <h2 className="mt-16 text-xl font-semibold text-text">Colour</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { name: "bg", hex: "#080810" },
              { name: "surface", hex: "#0e0e18" },
              { name: "border", hex: "#1e1e2e" },
              { name: "text", hex: "#f1f5f9" },
              { name: "text-muted", hex: "#94a3b8" },
              { name: "accent-indigo", hex: "#6366f1" },
            ].map((c) => (
              <div
                key={c.name}
                className="overflow-hidden rounded-xl border border-soft"
              >
                <div className="h-16" style={{ background: c.hex }} />
                <div className="bg-surface px-3 py-2">
                  <div className="text-xs font-medium text-text">{c.name}</div>
                  <code className="font-mono text-[11px] text-text-muted">
                    {c.hex}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
