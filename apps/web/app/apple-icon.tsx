import { ImageResponse } from "next/og";

/**
 * Apple touch icon — 180×180 PNG, generated from the same mark geometry as
 * `app/icon.svg` and `components/mark.tsx`. Generated rather than committed
 * as a binary so the mark stays a single source of truth: change the paths
 * here and in the two siblings, never re-export a PNG by hand.
 *
 * Safari ignores SVG apple-touch-icons, which is why this route exists at
 * all — `icon.svg` alone would leave iOS home-screen bookmarks blank.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080810",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 32 32" fill="none">
          <g
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M7 6.5V25.5" />
            <path d="M25 6.5V25.5" />
            <path d="M7 6.5C9.6 10 11.2 12.2 12.6 13.9" />
            <path d="M19.4 18.1C20.8 19.8 22.4 22 25 25.5" />
          </g>
          <circle
            cx="16"
            cy="16"
            r="3.4"
            fill="none"
            stroke="#818cf8"
            strokeWidth="2.6"
          />
        </svg>
      </div>
    ),
    size
  );
}
