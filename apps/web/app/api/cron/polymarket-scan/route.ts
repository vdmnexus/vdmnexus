import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel Cron relay: validates CRON_SECRET, then POSTs to the
// external Python agent's /scan webhook with the shared
// POLYMARKET_AGENT_WEBHOOK_SECRET. Returns immediately — the agent
// runs the scan as a background task.
export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  const provided =
    auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : headerSecret;
  if (provided !== cronSecret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const agentUrl = process.env.POLYMARKET_AGENT_URL;
  const webhookSecret = process.env.POLYMARKET_AGENT_WEBHOOK_SECRET;
  if (!agentUrl || !webhookSecret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "POLYMARKET_AGENT_URL and POLYMARKET_AGENT_WEBHOOK_SECRET must be set",
      },
      { status: 500 }
    );
  }

  const target = new URL("/scan", agentUrl).toString();
  try {
    const res = await fetch(target, {
      method: "POST",
      headers: {
        "x-webhook-secret": webhookSecret,
        "content-type": "application/json",
      },
      body: JSON.stringify({ source: "vercel-cron", at: new Date().toISOString() }),
      // Cron relay should not hang forever; the agent returns quickly.
      signal: AbortSignal.timeout(15_000),
    });
    const body = await safeText(res);
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      response: body.slice(0, 500),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
