import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const BRAND = {
  bg: "#080810",
  logoBg: "#020122",
  text: "#f1f5f9",
  muted: "#94a3b8",
  indigo: "#6366f1",
  indigoSoft: "#818cf8",
};

export type LogoIntroProps = {
  /** Total duration of the intro, in seconds. Defaults to 1.8. */
  durationSeconds?: number;
  /** Override the brand-mark size, in px. Defaults to 460. */
  logoSize?: number;
  /** Show the "signed inference" tagline under the signature stroke. */
  showTagline?: boolean;
};

// Hand-authored signature flourish that draws under the wordmark.
// Coordinates are in a 600×120 viewBox positioned beneath the SVG logo.
// The flourish enters from the lower-left, loops through the baseline,
// rises to underline "NEXUS", and finishes with a sharp upstroke on the
// right — the visual cue of a literal signature being made.
const SIGNATURE_PATH =
  "M 70 78 " +
  "C 110 92, 165 50, 215 70 " +
  "S 295 88, 345 62 " +
  "S 430 84, 478 56 " +
  "L 510 48 " +
  "L 526 64";

const SIGNATURE_LENGTH = 720; // approximate; oversized so dashoffset can clip cleanly

export const LogoIntro: React.FC<LogoIntroProps> = ({
  durationSeconds = 1.8,
  logoSize = 460,
  showTagline = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = Math.round(fps * durationSeconds);

  // Phase boundaries, in frames.
  const bgFadeEnd = Math.round(fps * 0.25);
  const logoStart = Math.round(fps * 0.15);
  const logoEntranceEnd = Math.round(fps * 0.75);
  const sigStart = Math.round(fps * 0.75);
  const sigEnd = Math.round(fps * 1.35);
  const taglineStart = Math.round(fps * 1.2);
  const taglineEnd = Math.round(fps * 1.5);
  const outroStart = totalFrames - Math.round(fps * 0.25);

  // Background: dark navy fades in over 0.25s, then a soft indigo halo
  // pulses in behind the mark.
  const bgOpacity = interpolate(frame, [0, bgFadeEnd], [0.7, 1], {
    extrapolateRight: "clamp",
  });
  const haloOpacity = interpolate(
    frame,
    [logoStart, logoEntranceEnd, outroStart, totalFrames],
    [0, 0.6, 0.6, 0.2],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Logo entrance: spring-scale from 0.92 → 1.0 + opacity 0 → 1.
  const entranceSpring = spring({
    frame: frame - logoStart,
    fps,
    config: { damping: 14, stiffness: 90, mass: 0.6 },
    durationInFrames: logoEntranceEnd - logoStart,
  });
  const logoOpacity = interpolate(
    frame,
    [logoStart, logoEntranceEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const logoScale = 0.92 + 0.08 * entranceSpring;

  // Signature stroke: strokeDashoffset interpolates from full length → 0,
  // making the pen "draw" the flourish.
  const sigProgress = interpolate(frame, [sigStart, sigEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dashOffset = SIGNATURE_LENGTH * (1 - sigProgress);

  // Tagline ("signed inference") fades up after the signature lands.
  const taglineOpacity = interpolate(
    frame,
    [taglineStart, taglineEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const taglineY = interpolate(frame, [taglineStart, taglineEnd], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Outro cross-fade to brand bg so the intro can stitch into a
  // longer reel cleanly.
  const outroFade = interpolate(frame, [outroStart, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: BRAND.bg,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <AbsoluteFill
        style={{
          background: BRAND.logoBg,
          opacity: bgOpacity * outroFade,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 45%, ${BRAND.indigo}33 0%, transparent 55%)`,
          opacity: haloOpacity * outroFade,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            width: logoSize,
            height: logoSize,
            opacity: logoOpacity * outroFade,
            transform: `scale(${logoScale})`,
          }}
        >
          <Img
            src={staticFile("vdm-logo.svg")}
            style={{
              width: logoSize,
              height: logoSize,
              display: "block",
            }}
          />
          {/* Signature stroke — drawn beneath the wordmark. The SVG
              overlay matches the logo's viewBox proportionally so the
              flourish sits centered under the mark. */}
          <svg
            width={logoSize}
            height={logoSize * 0.22}
            viewBox="0 0 600 120"
            style={{
              position: "absolute",
              left: 0,
              bottom: -logoSize * 0.05,
              pointerEvents: "none",
            }}
          >
            <defs>
              <linearGradient id="signink" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={BRAND.indigo} />
                <stop offset="60%" stopColor={BRAND.indigoSoft} />
                <stop offset="100%" stopColor={BRAND.indigo} />
              </linearGradient>
            </defs>
            <path
              d={SIGNATURE_PATH}
              stroke="url(#signink)"
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={SIGNATURE_LENGTH}
              strokeDashoffset={dashOffset}
              opacity={outroFade}
            />
          </svg>
        </div>
        {showTagline && (
          <div
            style={{
              marginTop: logoSize * 0.06,
              color: BRAND.muted,
              fontSize: 22,
              letterSpacing: 8,
              textTransform: "uppercase",
              opacity: taglineOpacity * outroFade,
              transform: `translateY(${taglineY}px)`,
            }}
          >
            signed inference
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
