import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getServiceClient } from "@/lib/supabase";
import { credit, debit, ensureAgent } from "@/lib/credits";
import { runChatInference, type ChatMessage } from "@/lib/chat-inference";
import { signReceipt } from "@/lib/receipts";
import { getAgentStats } from "@/lib/points";
import {
  getFacilitator,
  FacilitatorNotConfiguredError,
} from "@/lib/x402-facilitator";
import {
  X402_PAYMENT_HEADER,
  X402_REQUIRED_HEADER,
  X402_RESPONSE_HEADER,
  X402_NETWORKS,
  buildChallenge,
  decodeHeader,
  encodeHeader,
  extractPayerFromPayload,
  getAllowedAgents,
  getMaxPriceUsdc,
  getRecipientForNetwork,
  isMainnetNetwork,
  mainnetEnabled,
  resolveNetworkInput,
  type Network,
  type PaymentPayload,
  type ResourceInfo,
} from "@/lib/x402";
import { log, newRequestId } from "@/lib/log";
import {
  clientIp,
  enforceIp,
  enforcePubkey,
  rateLimitHeaders,
  type RateLimitDecision,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatCompletionsBody = {
  model?: string;
  messages?: ChatMessage[];
  stream?: boolean;
  /**
   * Optional per-request network selector. Accepted values:
   *   "devnet" | "solana-devnet" | "solana:devnet"
   *   "mainnet" | "solana-mainnet" | "solana:mainnet"
   *   "base" | "base-mainnet" | "eip155:8453"
   *   "base-sepolia" | "eip155:84532"
   * When omitted the route uses `X402_NETWORK` from env (default devnet).
   * Letting the agent choose per call means a single deploy can serve
   * both devnet (playground / demo traffic) and mainnet (real spend).
   */
  network?: string;
};

function err(
  error: string,
  status: number,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

function rateLimited(d: RateLimitDecision): NextResponse {
  const retry_after_ms = Math.max(0, d.reset - Date.now());
  return new NextResponse(
    JSON.stringify({
      ok: false,
      error: "rate_limited",
      key_type: d.key_type,
      retry_after_ms,
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        ...rateLimitHeaders(d),
      },
    }
  );
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function getNetwork(): Network {
  const env = process.env.X402_NETWORK?.trim();
  if (!env) return X402_NETWORKS.solanaDevnet;

  // Friendly aliases.
  const lower = env.toLowerCase();
  if (lower === "solana-mainnet") return X402_NETWORKS.solanaMainnet;
  if (lower === "solana-devnet") return X402_NETWORKS.solanaDevnet;
  if (lower === "base" || lower === "base-mainnet") return X402_NETWORKS.baseMainnet;
  if (lower === "base-sepolia") return X402_NETWORKS.baseSepolia;

  // Full CAIP-2 form pass-through.
  if (env === X402_NETWORKS.solanaMainnet) return X402_NETWORKS.solanaMainnet;
  if (env === X402_NETWORKS.baseMainnet) return X402_NETWORKS.baseMainnet;
  if (env === X402_NETWORKS.baseSepolia) return X402_NETWORKS.baseSepolia;

  return X402_NETWORKS.solanaDevnet;
}

function getFlatPriceUsdc(): number {
  const raw = process.env.X402_FLAT_PRICE_USDC;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 0.01;
}


function getResource(req: NextRequest): ResourceInfo {
  return {
    url: new URL("/api/v1/chat/completions", req.nextUrl.origin).toString(),
    description: "OpenAI-compatible chat completions, paid per call in USDC.",
    serviceName: "VDM Nexus",
    mimeType: "application/json",
  };
}

function isValidBody(b: ChatCompletionsBody): b is Required<
  Pick<ChatCompletionsBody, "model" | "messages">
> &
  ChatCompletionsBody {
  if (typeof b.model !== "string" || b.model.length === 0) return false;
  if (!Array.isArray(b.messages) || b.messages.length === 0) return false;
  for (const m of b.messages) {
    if (
      typeof m !== "object" ||
      m === null ||
      typeof (m as ChatMessage).role !== "string" ||
      typeof (m as ChatMessage).content !== "string"
    ) {
      return false;
    }
  }
  return true;
}

export async function POST(req: NextRequest) {
  const request_id = newRequestId(req);
  const t0 = Date.now();
  const ip = clientIp(req);
  const hasPaymentHeader = req.headers.get(X402_PAYMENT_HEADER) != null;

  log.info({
    event: "chat.probe_received",
    request_id,
    route: "/v1/chat/completions",
    method: "POST",
    has_payment_header: hasPaymentHeader,
  });

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
    return rateLimited(ipDecision);
  }

  const configuredPrice = getFlatPriceUsdc();
  const maxPrice = getMaxPriceUsdc();
  if (configuredPrice > maxPrice) {
    log.error({
      event: "price.over_cap",
      request_id,
      configured_usdc: configuredPrice,
      max_usdc: maxPrice,
    });
    return err("server_misconfigured", 500, {
      detail: "configured price exceeds NEXUS_MAX_PRICE_USDC",
    });
  }

  let body: ChatCompletionsBody;
  try {
    body = (await req.json()) as ChatCompletionsBody;
  } catch {
    log.warn({ event: "chat.body_invalid", request_id, reason: "json_parse" });
    return err("invalid_json", 400);
  }

  if (!isValidBody(body)) {
    log.warn({ event: "chat.body_invalid", request_id, reason: "shape" });
    return err("invalid_request", 400, {
      detail: "model + messages[] (each with role + content) required",
    });
  }

  if (body.stream) {
    log.warn({ event: "chat.body_invalid", request_id, reason: "stream_unsupported" });
    return err("streaming_not_supported", 400, {
      detail: "set stream=false; streaming arrives in a future release",
    });
  }

  // Resolve the effective network: body.network wins if present, else the
  // env default. This is what lets one deploy serve both devnet traffic
  // (playground, demos) and mainnet traffic (real agents) from the same
  // endpoint — the agent picks per call.
  let network: Network;
  if (body.network) {
    const resolved = resolveNetworkInput(body.network);
    if (!resolved) {
      log.warn({
        event: "chat.body_invalid",
        request_id,
        reason: "unknown_network",
        requested: body.network,
      });
      return err("invalid_network", 400, {
        detail:
          "network must be one of: devnet, mainnet, base, base-sepolia (or full CAIP-2)",
      });
    }
    network = resolved;
  } else {
    network = getNetwork();
  }

  if (isMainnetNetwork(network) && !mainnetEnabled()) {
    log.warn({
      event: "mainnet.disabled",
      request_id,
      network,
    });
    return err("mainnet_disabled", 503, {
      detail:
        "Mainnet traffic is temporarily disabled by the operator. Retry later.",
    });
  }

  const recipient = getRecipientForNetwork(network);
  if (!recipient) {
    log.error({
      event: "chat.server_misconfigured",
      request_id,
      reason: "no_recipient",
      network,
    });
    return err("server_misconfigured", 500, {
      detail: isMainnetNetwork(network)
        ? "NEXUS_MAINNET_DEPOSIT_ADDRESS or X402_RECIPIENT_ADDRESS or NEXUS_DEPOSIT_ADDRESS must be set"
        : "X402_RECIPIENT_ADDRESS or NEXUS_DEPOSIT_ADDRESS must be set",
    });
  }

  const amountUsdc = getFlatPriceUsdc();
  const resource = getResource(req);

  const challenge = buildChallenge({
    amountUsdc,
    payTo: recipient,
    network,
    resource,
  });
  const requirement = challenge.accepts[0];
  if (!requirement) {
    log.error({ event: "chat.server_misconfigured", request_id, reason: "no_payment_option" });
    return err("server_misconfigured", 500, { detail: "no payment option" });
  }

  const paymentHeader = req.headers.get(X402_PAYMENT_HEADER);

  if (!paymentHeader) {
    log.info({ event: "chat.challenge_issued", request_id, network, amount_usdc: amountUsdc });
    return new NextResponse(
      JSON.stringify({
        ok: false,
        error: "payment_required",
        challenge,
      }),
      {
        status: 402,
        headers: {
          "content-type": "application/json",
          [X402_REQUIRED_HEADER]: encodeHeader(challenge),
        },
      }
    );
  }

  const payload = decodeHeader<PaymentPayload>(paymentHeader);
  if (!payload) {
    log.warn({ event: "chat.payment_malformed", request_id });
    return err("payment_malformed", 402, {
      detail: "X-PAYMENT header is not valid base64 JSON",
    });
  }

  const claimedPayer = extractPayerFromPayload(payload);
  log.info({
    event: "chat.payment_decoded",
    request_id,
    scheme: requirement.scheme,
    network,
    payer: claimedPayer ?? null,
  });

  if (claimedPayer) {
    const pkDecision = await enforcePubkey(claimedPayer);
    if (!pkDecision.allowed) {
      log.warn({
        event: "rate_limit.blocked",
        request_id,
        agent_pubkey: claimedPayer,
        key_type: "pubkey",
        limit: pkDecision.limit,
        remaining: pkDecision.remaining,
        reset_ms: pkDecision.reset,
      });
      return rateLimited(pkDecision);
    }
  }

  const allowlist = getAllowedAgents();
  if (allowlist) {
    if (!claimedPayer || !allowlist.has(claimedPayer)) {
      log.warn({
        event: "agent.not_allowed",
        request_id,
        agent_pubkey: claimedPayer ?? undefined,
      });
      return err("agent_not_allowed", 403, {
        detail: "payer is not on the operator allowlist",
      });
    }
  }

  let facilitator;
  try {
    facilitator = await getFacilitator();
  } catch (e) {
    if (e instanceof FacilitatorNotConfiguredError) {
      log.error({
        event: "chat.server_misconfigured",
        request_id,
        reason: "facilitator_unconfigured",
        detail: e.message,
      });
      return err("server_misconfigured", 500, { detail: e.message });
    }
    log.error({
      event: "chat.facilitator_init_failed",
      request_id,
      reason: e instanceof Error ? e.message : "unknown",
    });
    return err("facilitator_init_failed", 500, {
      detail: e instanceof Error ? e.message : "unknown",
    });
  }
  let verified;
  try {
    verified = await facilitator.verify(payload, requirement);
  } catch (e) {
    log.error({
      event: "chat.verify_failed",
      request_id,
      agent_pubkey: claimedPayer ?? undefined,
      reason: e instanceof Error ? e.message : "verify_threw",
    });
    return err("facilitator_unreachable", 502, {
      detail: e instanceof Error ? e.message : "verify_threw",
    });
  }
  if (!verified.isValid) {
    log.warn({
      event: "chat.verify_failed",
      request_id,
      agent_pubkey: claimedPayer ?? undefined,
      reason: verified.invalidReason ?? verified.invalidMessage ?? "invalid",
    });
    return err("payment_invalid", 402, {
      detail: verified.invalidReason ?? verified.invalidMessage ?? "invalid",
    });
  }
  log.info({
    event: "chat.verify_ok",
    request_id,
    agent_pubkey: verified.payer ?? claimedPayer ?? undefined,
    amount_usdc: amountUsdc,
  });

  let settled;
  try {
    settled = await facilitator.settle(payload, requirement);
  } catch (e) {
    log.error({
      event: "chat.settle_failed",
      request_id,
      agent_pubkey: verified.payer ?? claimedPayer ?? undefined,
      reason: e instanceof Error ? e.message : "settle_threw",
    });
    return err("facilitator_unreachable", 502, {
      detail: e instanceof Error ? e.message : "settle_threw",
    });
  }
  if (!settled.success) {
    log.warn({
      event: "chat.settle_failed",
      request_id,
      agent_pubkey: verified.payer ?? claimedPayer ?? undefined,
      reason: settled.errorReason ?? settled.errorMessage ?? "failed",
    });
    return err("payment_failed", 402, {
      detail: settled.errorReason ?? settled.errorMessage ?? "failed",
    });
  }

  const payerWallet =
    settled.payer ?? verified.payer ?? extractPayerFromPayload(payload);
  if (!payerWallet) {
    log.error({ event: "chat.settle_failed", request_id, reason: "missing_payer" });
    return err("payment_missing_payer", 402);
  }
  log.info({
    event: "chat.settle_ok",
    request_id,
    agent_pubkey: payerWallet,
    tx_signature: settled.transaction,
  });

  const supabase = getServiceClient();
  await ensureAgent(supabase, payerWallet);

  try {
    await credit(supabase, {
      pubkey: payerWallet,
      usdc: amountUsdc,
      reason: "x402_payment",
      tx_signature: settled.transaction,
    });
    log.info({
      event: "chat.credit_written",
      request_id,
      agent_pubkey: payerWallet,
      amount_usdc: amountUsdc,
      tx_signature: settled.transaction,
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      log.warn({
        event: "chat.credit_replay",
        request_id,
        agent_pubkey: payerWallet,
        tx_signature: settled.transaction,
      });
      return err("payment_replay", 409);
    }
    throw e;
  }

  log.info({
    event: "inference.upstream_started",
    request_id,
    agent_pubkey: payerWallet,
    upstream_model: body.model,
  });
  const tInference = Date.now();

  let result;
  try {
    result = await runChatInference({
      upstreamModel: body.model,
      messages: body.messages,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "upstream_error";
    log.error({
      event: "inference.upstream_failed",
      request_id,
      agent_pubkey: payerWallet,
      upstream_model: body.model,
      latency_ms: Date.now() - tInference,
      reason: message,
    });
    const { error: logError } = await supabase.from("inference_logs").insert({
      agent_pubkey: payerWallet,
      request_nonce: settled.transaction,
      upstream: "openrouter",
      model: body.model,
      cost_usdc: 0,
      latency_ms: 0,
      status: "error",
      error: message,
      points: 0,
    });
    if (logError) {
      log.error({
        event: "log_insert_failed",
        request_id,
        agent_pubkey: payerWallet,
        tx_signature: settled.transaction,
        detail: logError.message,
      });
    }
    return err("upstream_error", 502, { detail: message });
  }

  log.info({
    event: "inference.upstream_ok",
    request_id,
    agent_pubkey: payerWallet,
    upstream_model: body.model,
    cost_usdc: result.cost_usdc,
    latency_ms: result.latency_ms,
    prompt_tokens: result.prompt_tokens,
    completion_tokens: result.completion_tokens,
  });

  await debit(supabase, {
    pubkey: payerWallet,
    usdc: result.cost_usdc,
    reason: "inference",
  });
  log.info({
    event: "ledger.debited",
    request_id,
    agent_pubkey: payerWallet,
    cost_usdc: result.cost_usdc,
  });

  const { data: logRow, error: logError } = await supabase
    .from("inference_logs")
    .insert({
      agent_pubkey: payerWallet,
      request_nonce: settled.transaction,
      upstream: result.upstream,
      model: body.model,
      prompt_tokens: result.prompt_tokens,
      completion_tokens: result.completion_tokens,
      cost_usdc: result.cost_usdc,
      latency_ms: result.latency_ms,
      status: "success",
      points: 1,
    })
    .select("id")
    .single();
  if (logError) {
    log.error({
      event: "log_insert_failed",
      request_id,
      agent_pubkey: payerWallet,
      tx_signature: settled.transaction,
      detail: logError.message,
    });
  }

  const { points_total: pointsTotal } = await getAgentStats(
    supabase,
    payerWallet
  );

  const promptForHash = body.messages
    .map((m) => `${m.role}:${m.content}`)
    .join("\n");
  const responseText = result.openaiResponse.choices[0]?.message.content ?? "";

  const receipt = signReceipt({
    v: 2 as const,
    agent_pubkey: payerWallet,
    upstream: result.upstream,
    model: body.model,
    cost_usdc: result.cost_usdc,
    prompt_hash: sha256(promptForHash),
    response_hash: sha256(responseText),
    timestamp: Date.now(),
    inference_id: logRow?.id ?? null,
    points_total: pointsTotal,
    payment: {
      scheme: "x402",
      amount_usdc: amountUsdc,
      tx_signature: settled.transaction,
      network,
      pay_to: recipient,
    },
  });

  log.info({
    event: "response.sent",
    request_id,
    agent_pubkey: payerWallet,
    status: 200,
    total_latency_ms: Date.now() - t0,
  });

  return new NextResponse(JSON.stringify(result.openaiResponse), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-nexus-receipt": encodeHeader(receipt),
      [X402_RESPONSE_HEADER]: encodeHeader({
        status: "settled",
        txSignature: settled.transaction,
        network,
      }),
      "X-RateLimit-Limit": String(ipDecision.limit),
      "X-RateLimit-Remaining": String(ipDecision.remaining),
      "X-RateLimit-Reset": String(ipDecision.reset),
    },
  });
}
