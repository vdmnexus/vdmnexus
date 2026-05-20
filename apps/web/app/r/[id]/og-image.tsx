import { ImageResponse } from "next/og";
import { getServiceClient } from "@/lib/server-supabase";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#080810";
const SURFACE = "#0e0e18";
const BORDER = "#1e1e2e";
const TEXT = "#f1f5f9";
const MUTED = "#94a3b8";
const INDIGO = "#6366f1";

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function truncateMiddle(s: string, head = 6, tail = 6): string {
  if (!s) return "";
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

async function loadPromptAndId(id: string): Promise<{
  prompt: string;
  id: string;
} | null> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("playground_receipts")
      .select("id, prompt")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return { prompt: String(data.prompt ?? ""), id: String(data.id) };
  } catch {
    return null;
  }
}

export async function generateReceiptOgImage(id: string): Promise<ImageResponse> {
  const row = await loadPromptAndId(id);
  const prompt = row?.prompt ?? "";
  const displayId = row?.id ?? id;

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
          backgroundColor: BG,
          backgroundImage: `radial-gradient(ellipse at top left, ${INDIGO}22 0%, ${BG}00 55%), radial-gradient(ellipse at bottom right, #3b82f622 0%, ${BG}00 55%)`,
          fontFamily: "Inter, system-ui, sans-serif",
          color: TEXT,
        }}
      >
        {/* Top row: brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <BrandMark />
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: -0.4,
                color: TEXT,
              }}
            >
              VDM Nexus
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              border: `1px solid ${INDIGO}66`,
              borderRadius: 999,
              backgroundColor: `${INDIGO}1a`,
              color: TEXT,
              fontSize: 18,
              letterSpacing: 2,
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: INDIGO,
                display: "block",
              }}
            />
            Signed inference receipt
          </div>
        </div>

        {/* Middle: prompt */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: 16,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: MUTED,
              fontWeight: 500,
            }}
          >
            Prompt
          </div>
          <div
            style={{
              fontSize: 44,
              lineHeight: 1.18,
              fontWeight: 600,
              letterSpacing: -0.8,
              color: TEXT,
              display: "flex",
            }}
          >
            {`"${truncate(prompt, 110)}"`}
          </div>
        </div>

        {/* Bottom: id + footer card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 28px",
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            backgroundColor: `${SURFACE}cc`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 14,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: MUTED,
              }}
            >
              Receipt id
            </div>
            <div
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 24,
                color: TEXT,
              }}
            >
              {truncateMiddle(displayId, 8, 8)}
            </div>
          </div>
          <div
            style={{
              fontSize: 20,
              color: MUTED,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span>verify at</span>
            <span style={{ color: TEXT, fontWeight: 600 }}>vdmnexus.com</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

function BrandMark() {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: `${INDIGO}26`,
        border: `1px solid ${INDIGO}66`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          backgroundImage: `linear-gradient(135deg, ${INDIGO}, #3b82f6)`,
        }}
      />
    </div>
  );
}
