"use client";

import Image from "next/image";

type AnimatedLogoProps = {
  /** Square render size in px. Default 240. */
  size?: number;
  /** Show the "signed inference" tagline below the mark. Default true. */
  withTagline?: boolean;
  /** Replay the signature stroke whenever this key changes. Useful for
   * binding the animation to a hero state or scroll trigger. */
  replayKey?: string | number;
  className?: string;
};

const SIGNATURE_PATH =
  "M 70 78 " +
  "C 110 92, 165 50, 215 70 " +
  "S 295 88, 345 62 " +
  "S 430 84, 478 56 " +
  "L 510 48 " +
  "L 526 64";

const SIGNATURE_LENGTH = 720;

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
      <div
        className="relative animated-logo-mark"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.svg"
          alt="VDM Nexus"
          width={size}
          height={size}
          priority
          className="block animated-logo-rise"
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 600 120"
          width={size}
          height={size * 0.22}
          className="absolute left-0 pointer-events-none animated-logo-sig"
          style={{ bottom: -size * 0.05 }}
        >
          <defs>
            <linearGradient
              id="vdm-sig-ink"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
              gradientUnits="objectBoundingBox"
            >
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="60%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <path
            d={SIGNATURE_PATH}
            stroke="url(#vdm-sig-ink)"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={SIGNATURE_LENGTH}
            strokeDashoffset={SIGNATURE_LENGTH}
            className="animated-logo-stroke"
          />
        </svg>
      </div>
      {withTagline && (
        <div
          className="animated-logo-tagline mt-4 text-text-muted text-xs tracking-[0.5em] uppercase"
          style={{ marginTop: size * 0.06 }}
        >
          signed inference
        </div>
      )}

      <style jsx>{`
        .animated-logo-mark {
          animation: animated-logo-halo 4s ease-in-out 1.6s infinite;
        }
        .animated-logo-rise {
          opacity: 0;
          transform: scale(0.94);
          animation: animated-logo-rise 700ms cubic-bezier(0.16, 1, 0.3, 1)
            150ms forwards;
        }
        .animated-logo-sig {
          opacity: 0;
          animation: animated-logo-sig-fade 0ms 700ms forwards;
        }
        .animated-logo-stroke {
          animation: animated-logo-sign 900ms cubic-bezier(0.65, 0, 0.35, 1)
            850ms forwards;
        }
        .animated-logo-tagline {
          opacity: 0;
          transform: translateY(8px);
          animation: animated-logo-tagline 500ms ease-out 1300ms forwards;
        }

        @keyframes animated-logo-rise {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes animated-logo-sig-fade {
          to {
            opacity: 1;
          }
        }
        @keyframes animated-logo-sign {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes animated-logo-tagline {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes animated-logo-halo {
          0%,
          100% {
            filter: drop-shadow(0 0 0 transparent);
          }
          50% {
            filter: drop-shadow(0 0 24px rgba(99, 102, 241, 0.35));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animated-logo-mark,
          .animated-logo-rise,
          .animated-logo-sig,
          .animated-logo-stroke,
          .animated-logo-tagline {
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
