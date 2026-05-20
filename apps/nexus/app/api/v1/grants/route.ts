import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { isValidPubkey } from "@/lib/solana";
import { credit, ensureAgent, getBalance } from "@/lib/credits";
import {
  countGrantsByIp,
  getGrantAmountUsdc,
  getGrantDailyBudgetUsdc,
  getGrantMaxPerIp,
  insertGrant,
  sumGrantsToday,
} from "@/lib/grants";
import { log, newRequestId } from "@/lib/log";
import { clientIp, enforceIp, rateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  agent_pubkey?: string;
};

function err(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "vdm-fallback-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function POST(req: NextRequest) {
  const request_id = newRequestId(req);
  const ip = clientIp(req);

  const ipDecision = await enforceIp(ip);
  if (!ipDecision.allowed) {
    log.warn({
      event: "rate_limit.blocked",
      request_id,
      key_type: "ip",
      limit: ipDecision.limit,
      remaining: ipDecision.remaining,
      reset_ms: ipDecision.reset,
    });
    return new NextResponse(
      JSON.stringify({
        ok: false,
        error: "rate_limited",
        key_type: ipDecision.key_type,
        retry_after_ms: Math.max(0, ipDecision.reset - Date.now()),
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(
            Math.max(1, Math.ceil((ipDecision.reset - Date.now()) / 1000))
          ),
          ...rateLimitHeaders(ipDecision),
        },
      }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    log.warn({ event: "grant.body_invalid", request_id, reason: "json_parse" });
    return err("invalid_json", 400);
  }

  const pubkey = body.agent_pubkey;
  if (typeof pubkey !== "string" || !isValidPubkey(pubkey)) {
    log.warn({ event: "grant.body_invalid", request_id, reason: "invalid_pubkey" });
    return err("invalid_pubkey", 400);
  }

  const ipHash = hashIp(ip);
  const amount = getGrantAmountUsdc();
  const supabase = getServiceClient();

  // 1. Per-IP cap. Lifetime, not sliding — once an IP has burned through its
  //    allotment it can't keep generating fresh keypairs to keep claiming.
  const perIpCount = await countGrantsByIp(supabase, ipHash);
  const maxPerIp = getGrantMaxPerIp();
  if (perIpCount >= maxPerIp) {
    log.warn({
      event: "grant.ip_cap_hit",
      request_id,
      ip_hash: ipHash,
      observed: perIpCount,
      cap: maxPerIp,
    });
    return err("ip_grant_exhausted", 429, {
      detail: `this IP has already received ${perIpCount} grant(s); cap is ${maxPerIp}`,
    });
  }

  // 2. Global daily budget. Fail-closed if adding this grant would exceed
  //    the sponsored pool's allowance for the UTC day. Operators can
  //    raise NEXUS_GRANT_BUDGET_DAILY_USDC in Vercel env without a deploy.
  const spentToday = await sumGrantsToday(supabase);
  const dailyCap = getGrantDailyBudgetUsdc();
  if (spentToday + amount > dailyCap) {
    log.warn({
      event: "grant.daily_budget_hit",
      request_id,
      spent_today_usdc: spentToday,
      amount_usdc: amount,
      cap_usdc: dailyCap,
    });
    return err("global_grant_budget_exhausted", 503, {
      detail: "daily sponsored-grant budget reached; try again after 00:00 UTC",
    });
  }

  // 3. Ensure the agent row exists (FK requirement for agent_grants) and
  //    try to insert the grant. The unique index on agent_pubkey rejects
  //    repeat issuance with code 23505 → "grant_already_issued".
  await ensureAgent(supabase, pubkey);

  try {
    await insertGrant(supabase, {
      agentPubkey: pubkey,
      ipHash,
      amountUsdc: amount,
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      const balance = await getBalance(supabase, pubkey);
      log.info({
        event: "grant.already_issued",
        request_id,
        agent_pubkey: pubkey,
        balance_usdc: balance,
      });
      return err("grant_already_issued", 409, {
        detail: "this agent_pubkey has already received its sponsored grant",
        balance_usdc: balance,
      });
    }
    throw e;
  }

  // 4. Credit the ledger. If this fails after the grant row was written we
  //    end up with a grant record but no balance — the operator can recredit
  //    manually by inspecting agent_grants. The reverse ordering would be
  //    worse: a credited balance with no grant audit row, which is the case
  //    we never want.
  await credit(supabase, {
    pubkey,
    usdc: amount,
    reason: "sponsored_grant",
  });

  const balance = await getBalance(supabase, pubkey);
  log.info({
    event: "grant.issued",
    request_id,
    agent_pubkey: pubkey,
    amount_usdc: amount,
    balance_usdc: balance,
    ip_hash: ipHash,
  });

  return NextResponse.json(
    {
      ok: true,
      agent_pubkey: pubkey,
      grant_usdc: amount,
      balance_usdc: balance,
      next_steps: [
        "Your agent now has a credit balance — make signed inference calls at /api/v1/inference",
        "Top up further by sending USDC to the address at /api/v1/deposit-address",
      ],
    },
    {
      headers: rateLimitHeaders(ipDecision),
    }
  );
}
