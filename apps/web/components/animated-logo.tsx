"use client";

type AnimatedLogoProps = {
  /** Square render size of the mark in px. Default 240. */
  size?: number;
  /** Show the "the agent vault" tagline below the lockup. Default true. */
  withTagline?: boolean;
  /** Replay the draw-on whenever this key changes. Useful for binding the
   * animation to a hero state or a scroll trigger. */
  replayKey?: string | number;
  className?: string;
};

/**
 * The mark, drawn on.
 *
 * Same geometry as `components/mark.tsx` — duplicated here rather than
 * imported because each path needs its own dash length and delay to draw
 * in sequence: guardrails first (the limits exist before the agent does),
 * then the rein under tension, then the node ring where the decision gets
 * signed.
 *
 * Everything is `currentColor`, so the animation inherits colour from its
 * container exactly like the static mark does.
 */
const STROKES: Array<{ d: string; len: number; delay: number }> = [
  // guardrails — 19 units tall each
  { d: "M7 6.5V25.5", len: 19, delay: 0 },
  { d: "M25 6.5V25.5", len: 19, delay: 120 },
  // the rein, both halves, drawn outward from the node
  { d: "M7 6.5C9.6 10 11.2 12.2 12.6 13.9", len: 11, delay: 420 },
  { d: "M19.4 18.1C20.8 19.8 22.4 22 25 25.5", len: 11, delay: 420 },
];

const RING_CIRCUMFERENCE = 22; // 2πr, r = 3.4

export function AnimatedLogo({
  size = 240,
  withTagline = true,
  replayKey,
  className,
}: AnimatedLogoProps) {
  return (
    <div
      key={replayKey}
      className={`inline-flex flex-col items-center ${className ?? ""}`}
      style={{ width: size }}
    >
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        fill="none"
        role="img"
        aria-label="VDM Nexus"
        className="animated-mark-halo"
      >
        {STROKES.map((s) => (
          <path
            key={s.d}
            d={s.d}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={s.len}
            strokeDashoffset={s.len}
            className="animated-mark-draw"
            style={{ animationDelay: `${s.delay}ms` }}
          />
        ))}
        <circle
          cx="16"
          cy="16"
          r="3.4"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE}
          className="animated-mark-draw animated-mark-ring"
        />
      </svg>

      <div
        className="animated-mark-word font-semibold tracking-tight"
        style={{ fontSize: size * 0.14, marginTop: size * 0.07 }}
        aria-hidden
      >
        VDM Nexus
      </div>

      {withTagline && (
        <div
          className="animated-mark-tagline text-text-muted uppercase"
          style={{
            fontSize: Math.max(9, size * 0.045),
            letterSpacing: "0.42em",
            marginTop: size * 0.045,
          }}
        >
          the agent vault
        </div>
      )}

      <style jsx>{`
        .animated-mark-draw {
          animation: animated-mark-draw 700ms cubic-bezier(0.65, 0, 0.35, 1)
            both;
        }
        .animated-mark-ring {
          animation-delay: 820ms;
          animation-duration: 520ms;
        }
        .animated-mark-halo {
          animation: animated-mark-halo 4s ease-in-out 1.6s infinite;
        }
        .animated-mark-word {
          opacity: 0;
          transform: translateY(6px);
          animation: animated-mark-fade 460ms ease-out 1180ms forwards;
        }
        .animated-mark-tagline {
          opacity: 0;
          transform: translateY(6px);
          animation: animated-mark-fade 460ms ease-out 1360ms forwards;
        }

        @keyframes animated-mark-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes animated-mark-fade {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes animated-mark-halo {
          0%,
          100% {
            filter: drop-shadow(0 0 0 transparent);
          }
          50% {
            filter: drop-shadow(0 0 24px rgba(99, 102, 241, 0.35));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animated-mark-draw,
          .animated-mark-halo,
          .animated-mark-word,
          .animated-mark-tagline {
            animation: none;
            opacity: 1;
            transform: none;
            stroke-dashoffset: 0;
            filter: none;
          }
        }
      `}</style>
    </div>
  );
}
