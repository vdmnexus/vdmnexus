import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const BG = "#080810";
const BORDER = "#1e1e2e";
const TEXT = "#f1f5f9";
const MUTED = "#94a3b8";
const SOFT = "#cbd5e1";
const INDIGO = "#6366f1";

const SIZE = { width: 1200, height: 630 };

export async function GET(req: NextRequest): Promise<ImageResponse> {
  const { searchParams } = new URL(req.url);

  const headline = searchParams.get("headline") ?? "VDM Nexus";
  const subhead = searchParams.get("subhead") ?? "";
  const eyebrow = searchParams.get("eyebrow") ?? "BUILDING IN PUBLIC";
  const badge = searchParams.get("badge") ?? "";
  const footerLeft = searchParams.get("footer_left") ?? "vdmnexus.com";
  const footerRight = searchParams.get("footer_right") ?? "VDMNEXUS.COM";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: BG,
          backgroundImage: [
            `radial-gradient(ellipse at top left, rgba(99,102,241,0.22) 0%, rgba(8,8,16,0) 55%)`,
            `linear-gradient(to right, rgba(94,102,241,0.06) 1px, transparent 1px)`,
            `linear-gradient(to bottom, rgba(94,102,241,0.06) 1px, transparent 1px)`,
          ].join(", "),
          backgroundSize: "100% 100%, 60px 60px, 60px 60px",
          color: TEXT,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                border: `1px solid ${BORDER}`,
                background:
                  "linear-gradient(135deg, rgba(99,102,241,0.45), rgba(59,130,246,0.18))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 26,
                letterSpacing: -1,
              }}
            >
              N
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.3 }}>
              VDM Nexus
            </div>
            {badge ? (
              <div
                style={{
                  marginLeft: 8,
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: `1px solid ${INDIGO}`,
                  color: INDIGO,
                  fontSize: 16,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {badge}
              </div>
            ) : null}
          </div>

          <div
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              border: `1px solid ${BORDER}`,
              fontSize: 18,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: MUTED,
              display: "flex",
              alignItems: "center",
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: headline.length > 38 ? 96 : 124,
              fontWeight: 700,
              letterSpacing: -4,
              lineHeight: 1.02,
              maxWidth: 1080,
            }}
          >
            {headline}
          </div>
          {subhead ? (
            <div
              style={{
                fontSize: 30,
                color: SOFT,
                maxWidth: 1000,
                lineHeight: 1.35,
              }}
            >
              {subhead}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 9999,
                background: INDIGO,
                boxShadow: `0 0 12px rgba(99,102,241,0.7)`,
              }}
            />
            <span>{footerLeft}</span>
          </div>
          <div style={{ letterSpacing: 3 }}>{footerRight}</div>
        </div>
      </div>
    ),
    { ...SIZE },
  );
}
