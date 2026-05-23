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

type Loaded = {
  id: string;
  prompt: string;
  model: string | null;
  cost_usdc: number | null;
  network: string | null;
  agent_pubkey: string | null;
};

async function loadReceipt(id: string): Promise<Loaded | null> {
  try {
    const supabase = getServiceClient();
    // Try the playground table first (10-char short ids; prompt + response
    // are public there).
    const { data: pg } = await supabase
      .from("playground_receipts")
      .select("id, prompt, receipt")
      .eq("id", id)
      .maybeSingle();
    if (pg) {
      const receipt = (pg.receipt ?? {}) as Record<string, unknown>;
      const payment = receipt.payment as { network?: unknown } | undefined;
      return {
        id: String(pg.id),
        prompt: String(pg.prompt ?? ""),
        model: typeof receipt.model === "string" ? receipt.model : null,
        cost_usdc:
          typeof receipt.cost_usdc === "number" ? receipt.cost_usdc : null,
        network:
          payment && typeof payment.network === "string"
            ? payment.network
            : null,
        agent_pubkey:
          typeof receipt.agent_pubkey === "string"
            ? receipt.agent_pubkey
            : null,
      };
    }
    // Fall back to inference_logs (UUID ids; hashes-only — no prompt body).
    const { data: log } = await supabase
      .from("inference_logs")
      .select("id, model, cost_usdc, receipt_json, agent_pubkey")
      .eq("id", id)
      .eq("status", "success")
      .maybeSingle();
    if (log) {
      const receipt = (log.receipt_json ?? {}) as Record<string, unknown>;
      const payment = receipt.payment as { network?: unknown } | undefined;
      return {
        id: String(log.id),
        prompt: "",
        model: (log.model as string | null) ?? null,
        cost_usdc: log.cost_usdc != null ? Number(log.cost_usdc) : null,
        network:
          payment && typeof payment.network === "string"
            ? payment.network
            : null,
        agent_pubkey: (log.agent_pubkey as string | null) ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function networkBadge(network: string | null): string {
  if (!network) return "devnet";
  const lower = network.toLowerCase();
  if (lower.includes("devnet") || lower.includes("etwtrabz")) return "devnet";
  if (lower.startsWith("solana:")) return "mainnet";
  if (lower === "eip155:84532") return "base sepolia";
  if (lower === "eip155:8453") return "base";
  return network;
}

export async function generateReceiptOgImage(id: string): Promise<ImageResponse> {
  const row = await loadReceipt(id);
  const prompt = row?.prompt ?? "";
  const displayId = row?.id ?? id;
  const model = row?.model ?? null;
  const cost = row?.cost_usdc ?? null;
  const network = networkBadge(row?.network ?? null);
  const isMainnetCard = network === "mainnet" || network === "base";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px",
          backgroundColor: BG,
          backgroundImage: `radial-gradient(ellipse at top left, ${INDIGO}30 0%, ${BG}00 55%), radial-gradient(ellipse at bottom right, #3b82f628 0%, ${BG}00 55%)`,
          fontFamily: "Inter, system-ui, sans-serif",
          color: TEXT,
        }}
      >
        {/* Top: brand + network badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <BrandMark />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  letterSpacing: -0.4,
                  color: TEXT,
                }}
              >
                VDM Nexus
              </div>
              <div
                style={{
                  fontSize: 14,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: MUTED,
                }}
              >
                Signed inference receipt
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              border: `1px solid ${
                isMainnetCard ? "#fbbf2466" : "#34d39966"
              }`,
              borderRadius: 999,
              backgroundColor: isMainnetCard ? "#fbbf241a" : "#34d3991a",
              color: isMainnetCard ? "#fcd34d" : "#6ee7b7",
              fontSize: 16,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: isMainnetCard ? "#fcd34d" : "#34d399",
                display: "block",
              }}
            />
            {network}
          </div>
        </div>

        {/* Middle: model headline + cost */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {model ? (
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 24,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  letterSpacing: -1,
                  color: TEXT,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  display: "flex",
                }}
              >
                {truncate(model, 28)}
              </div>
              {cost != null ? (
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 600,
                    color: INDIGO,
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    display: "flex",
                  }}
                >
                  ${cost.toFixed(6)} USDC
                </div>
              ) : null}
            </div>
          ) : null}
          {prompt ? (
            <div
              style={{
                fontSize: 28,
                lineHeight: 1.3,
                fontStyle: "italic",
                color: MUTED,
                display: "flex",
              }}
            >
              {`"${truncate(prompt, 130)}"`}
            </div>
          ) : (
            <div
              style={{
                fontSize: 26,
                lineHeight: 1.3,
                color: MUTED,
                display: "flex",
              }}
            >
              Hash-only receipt — prompt and response never leave the agent.
            </div>
          )}
        </div>

        {/* Bottom: id + verify CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 28px",
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            backgroundColor: `${SURFACE}e0`,
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
                fontSize: 13,
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
                fontSize: 22,
                color: TEXT,
              }}
            >
              {truncateMiddle(displayId, 8, 8)}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 20,
              color: MUTED,
            }}
          >
            <span>verify at</span>
            <span style={{ color: TEXT, fontWeight: 600 }}>
              verify.vdmnexus.com
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
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
