import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LogoIntro } from "./LogoIntro.js";

const BRAND = {
  bg: "#080810",
  surface: "#0e0e18",
  border: "#1e1e2e",
  text: "#f1f5f9",
  muted: "#94a3b8",
  indigo: "#6366f1",
  blue: "#3b82f6",
};

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  feat: { label: "FEAT", color: BRAND.indigo },
  fix: { label: "FIX", color: BRAND.blue },
  chore: { label: "CHORE", color: "#475569" },
  docs: { label: "DOCS", color: "#06b6d4" },
  refactor: { label: "REFACTOR", color: "#94a3b8" },
  infra: { label: "INFRA", color: "#22c55e" },
};

export type Ship = {
  pr_number: number;
  type: string;
  title: string;
  summary: string;
};

export type WeeklyShipsReelProps = {
  ships: Ship[];
  headline: string;
  footer: string;
  /** Duration of the LogoIntro pre-roll, in seconds. Set to 0 to skip. */
  logoIntroSeconds?: number;
};

const TITLE_SECONDS = 1.5;
const SECONDS_PER_CARD = 2;
const OUTRO_SECONDS = 1.5;
const DEFAULT_LOGO_INTRO_SECONDS = 1.8;

const Background: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at 20% 0%, ${BRAND.indigo}22 0%, transparent 50%), ${BRAND.bg}`,
    }}
  />
);

const Title: React.FC<{ headline: string }> = ({ headline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.3, fps * TITLE_SECONDS - fps * 0.3, fps * TITLE_SECONDS], [0, 1, 1, 0]);
  const y = spring({ frame, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `translateY(${(1 - y) * 30}px)`,
      }}
    >
      <div
        style={{
          color: BRAND.muted,
          fontSize: 28,
          fontFamily: "Inter, system-ui, sans-serif",
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        VDM Nexus · ship log
      </div>
      <div
        style={{
          color: BRAND.text,
          fontSize: 88,
          fontWeight: 700,
          marginTop: 24,
          fontFamily: "Inter, system-ui, sans-serif",
          letterSpacing: -1,
        }}
      >
        {headline}
      </div>
    </AbsoluteFill>
  );
};

const ShipCard: React.FC<{ ship: Ship }> = ({ ship }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = fps * SECONDS_PER_CARD;
  const opacity = interpolate(frame, [0, fps * 0.25, total - fps * 0.25, total], [0, 1, 1, 0]);
  const slide = spring({ frame, fps, config: { damping: 18 } });
  const badge = TYPE_BADGE[ship.type] ?? TYPE_BADGE.chore;

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `translateX(${(1 - slide) * 40}px)`,
      }}
    >
      <div
        style={{
          width: 1440,
          padding: 56,
          background: BRAND.surface,
          border: `1px solid ${BRAND.border}`,
          borderRadius: 24,
          boxShadow: `0 0 80px ${BRAND.indigo}22`,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: `${badge.color}33`,
              color: badge.color,
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: 2,
            }}
          >
            {badge.label}
          </span>
          <span style={{ color: BRAND.muted, fontSize: 22 }}>#{ship.pr_number}</span>
        </div>
        <div
          style={{
            color: BRAND.text,
            fontSize: 56,
            fontWeight: 700,
            marginTop: 28,
            lineHeight: 1.1,
            letterSpacing: -0.5,
          }}
        >
          {ship.title}
        </div>
        <div style={{ color: BRAND.muted, fontSize: 28, marginTop: 20, lineHeight: 1.45 }}>
          {ship.summary}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ footer: string }> = ({ footer }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.3, fps * OUTRO_SECONDS], [0, 1, 1]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity }}>
      <div
        style={{
          color: BRAND.muted,
          fontSize: 26,
          fontFamily: "Inter, system-ui, sans-serif",
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        signed inference
      </div>
      <div
        style={{
          color: BRAND.text,
          fontSize: 96,
          fontWeight: 700,
          marginTop: 16,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {footer}
      </div>
    </AbsoluteFill>
  );
};

export const WeeklyShipsReel: React.FC<WeeklyShipsReelProps> = ({
  ships,
  headline,
  footer,
  logoIntroSeconds = DEFAULT_LOGO_INTRO_SECONDS,
}) => {
  const { fps } = useVideoConfig();
  const introFrames = Math.round(fps * logoIntroSeconds);
  const titleFrames = Math.round(fps * TITLE_SECONDS);
  const cardFrames = Math.round(fps * SECONDS_PER_CARD);
  const outroFrames = Math.round(fps * OUTRO_SECONDS);

  return (
    <AbsoluteFill>
      <Background />
      {introFrames > 0 && (
        <Sequence from={0} durationInFrames={introFrames}>
          <LogoIntro durationSeconds={logoIntroSeconds} />
        </Sequence>
      )}
      <Sequence from={introFrames} durationInFrames={titleFrames}>
        <Title headline={headline} />
      </Sequence>
      {ships.map((ship, i) => (
        <Sequence
          key={ship.pr_number}
          from={introFrames + titleFrames + i * cardFrames}
          durationInFrames={cardFrames}
        >
          <ShipCard ship={ship} />
        </Sequence>
      ))}
      <Sequence
        from={introFrames + titleFrames + ships.length * cardFrames}
        durationInFrames={outroFrames}
      >
        <Outro footer={footer} />
      </Sequence>
    </AbsoluteFill>
  );
};
