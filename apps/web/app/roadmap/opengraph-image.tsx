import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VDM Nexus — Live Roadmap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background:
            "radial-gradient(ellipse at top, rgba(99,102,241,0.25) 0%, rgba(8,8,16,0) 60%), #080810",
          color: "#f1f5f9",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: "1px solid #1e1e2e",
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.4), rgba(59,130,246,0.15))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: -1,
            }}
          >
            N
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>
            VDM Nexus
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 18,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#94a3b8",
            }}
          >
            Built in public
          </div>
          <div
            style={{
              fontSize: 132,
              fontWeight: 600,
              letterSpacing: -4,
              lineHeight: 1,
            }}
          >
            Roadmap
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#cbd5e1",
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            Infrastructure for autonomous AI agents. Five phases, live build log.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            color: "#94a3b8",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 9999,
                background: "#6366f1",
                boxShadow: "0 0 12px rgba(99,102,241,0.7)",
              }}
            />
            <span>Phase 1 — Foundation · Active</span>
          </div>
          <div>vdmnexus.com/roadmap</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
