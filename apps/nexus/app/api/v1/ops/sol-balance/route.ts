import { NextResponse, type NextRequest } from "next/server";
import { getBalanceLamports } from "@/lib/solana-rpc";
import { log, newRequestId } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SOL balance probe for the facilitator fee-payer wallet.
 *
 * The facilitator pays the SOL fee on every settled USDC payment. If the
 * fee-payer wallet drains below the alarm threshold, `chat.settle_failed`
 * starts firing and mainnet traffic silently breaks. This endpoint lets
 * Vercel Cron (every 5 min) check the on-chain balance and emit a
 * structured warn-level log when we cross the threshold — Vercel log
 * search (`level:warn event:sol_balance.low`) becomes the alert surface.
 *
 * Auth: same shape as /deposits/scan — CRON_SECRET in either Authorization
 * Bearer or X-Cron-Secret header.
 *
 * Thresholds (lamports, 1 SOL = 1_000_000_000):
 *   - warn  : 100_000_000 (0.10 SOL) — runbook's "page me" threshold
 *   - critical: 20_000_000 (0.02 SOL) — emitted as ERROR, also implies
 *     mainnet settlements are about to stall
 */
const WARN_THRESHOLD_LAMPORTS = 100_000_000;
const CRITICAL_THRESHOLD_LAMPORTS = 20_000_000;
const LAMPORTS_PER_SOL = 1_000_000_000;

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret === expected) return true;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${expected}`) return true;
  return false;
}

async function probe(req: NextRequest) {
  const request_id = newRequestId(req);

  const address = process.env.NEXUS_DEPOSIT_ADDRESS?.trim();
  if (!address) {
    log.error({
      event: "sol_balance.misconfigured",
      request_id,
      reason: "no_deposit_address",
    });
    return NextResponse.json(
      { ok: false, error: "deposit_address_not_set" },
      { status: 500 }
    );
  }

  let lamports: number;
  try {
    lamports = await getBalanceLamports(address);
  } catch (e) {
    log.error({
      event: "sol_balance.rpc_failed",
      request_id,
      address,
      detail: e instanceof Error ? e.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "rpc_failed" }, { status: 502 });
  }

  const sol = lamports / LAMPORTS_PER_SOL;
  const network = process.env.SOLANA_NETWORK ?? "devnet";

  if (lamports < CRITICAL_THRESHOLD_LAMPORTS) {
    log.error({
      event: "sol_balance.critical",
      request_id,
      address,
      network,
      lamports,
      sol,
      threshold_lamports: CRITICAL_THRESHOLD_LAMPORTS,
    });
  } else if (lamports < WARN_THRESHOLD_LAMPORTS) {
    log.warn({
      event: "sol_balance.low",
      request_id,
      address,
      network,
      lamports,
      sol,
      threshold_lamports: WARN_THRESHOLD_LAMPORTS,
    });
  } else {
    log.info({
      event: "sol_balance.ok",
      request_id,
      address,
      network,
      lamports,
      sol,
    });
  }

  return NextResponse.json({
    ok: true,
    address,
    network,
    lamports,
    sol,
    status:
      lamports < CRITICAL_THRESHOLD_LAMPORTS
        ? "critical"
        : lamports < WARN_THRESHOLD_LAMPORTS
        ? "low"
        : "ok",
  });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return probe(req);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return probe(req);
}
