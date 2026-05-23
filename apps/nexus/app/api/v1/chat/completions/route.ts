import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getServiceClient } from "@/lib/supabase";
import { credit, debit, ensureAgent } from "@/lib/credits";
import { runChatInference, type ChatMessage } from "@/lib/chat-inference";
import { canonicalize, signReceipt } from "@/lib/receipts";
import { getAgentStats } from "@/lib/points";
import { computeFeeBreakdown } from "@/lib/pricing";
import { recordBurnPoolFee } from "@/lib/burn-pool";
import {
  getFacilitator,
  getCdpFacilitator,
  getCdpFeePayer,
  CdpFacilitatorNotConfiguredError,
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

  // Wire 1 Phase A — every paid call bundles the inference component
  // (X402_FLAT_PRICE_USDC) with a flat USDC receipt fee. The agent
  // sees one line item; the ledger splits the fee into burn-pool and
  // treasury shares. The max-price cap also covers the total, so a
  // misconfigured fee can't slip past NEXUS_MAX_PRICE_USDC either.
  const feeBreakdown = computeFeeBreakdown(configuredPrice);
  if (feeBreakdown.totalUsdc > maxPrice) {
    log.error({
      event: "price.over_cap",
      request_id,
      configured_usdc: configuredPrice,
      fee_usdc: feeBreakdown.receiptFeeUsdc,
      total_usdc: feeBreakdown.totalUsdc,
      max_usdc: maxPrice,
    });
    return err("server_misconfigured", 500, {
      detail:
        "configured price + receipt fee exceeds NEXUS_MAX_PRICE_USDC",
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

  // Resolve the effective network: `X-Nexus-Network` header wins, then
  // `network` body field, then the env default. This is what lets one
  // deploy serve both devnet traffic (playground, demos) and mainnet
  // traffic (real agents) from the same endpoint — the agent picks per
  // call, either via a header (handy for OpenAI-client-compat shims that
  // can't easily edit the body) or via the body field.
  const networkHeader = req.headers.get("x-nexus-network");
  const networkInput = networkHeader?.trim() || body.network;
  let network: Network;
  if (networkInput) {
    const resolved = resolveNetworkInput(networkInput);
    if (!resolved) {
      log.warn({
        event: "chat.body_invalid",
        request_id,
        reason: "unknown_network",
        requested: networkInput,
        source: networkHeader ? "header" : "body",
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

  // The x402 challenge advertises the total the agent must pay —
  // inference component + receipt fee. The breakdown is recorded in
  // the burn_pool_ledger and shown on the receipt as separate fields.
  const amountUsdc = feeBreakdown.totalUsdc;
  const resource = getResource(req);

  // Read the facilitator selector up front. `?via=cdp` forces both the
  // challenge (which fee-payer to declare in `extra`) and the later
  // settle path to align on Coinbase's facilitator. Default route still
  // declares our own deposit as fee-payer (matching the self-hosted
  // facilitator that signs on our behalf).
  const facilitatorChoice = new URL(req.url).searchParams
    .get("via")
    ?.trim()
    .toLowerCase();
  const useCdp = facilitatorChoice === "cdp";

  // When routing through CDP, ask their `/supported` endpoint which
  // signer they want to manage the fee-payer slot. Declaring our own
  // address (the self-hosted default) gets the payload rejected with
  // `feePayer not managed` — CDP co-signs as fee-payer themselves.
  let feePayer: string | undefined;
  if (useCdp) {
    try {
      feePayer = await getCdpFeePayer(network);
      log.info({
        event: "chat.cdp_fee_payer_resolved",
        request_id,
        network,
        fee_payer: feePayer,
      });
    } catch (e) {
      log.error({
        event: "chat.cdp_fee_payer_lookup_failed",
        request_id,
        network,
        reason: e instanceof Error ? e.message : "unknown",
      });
      return err("cdp_fee_payer_lookup_failed", 502, {
        detail: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  const challenge = buildChallenge({
    amountUsdc,
    payTo: recipient,
    network,
    resource,
    ...(feePayer ? { feePayer } : {}),
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

  // NEXUS_ALLOWED_AGENTS is a mainnet-only gate. Devnet / Sepolia traffic
  // stays open even when the list is set — so an operator can lock down
  // mainnet for the first days post-flip without breaking the public
  // playground or other testnet demos that run against the same endpoint.
  const allowlist = getAllowedAgents();
  if (allowlist && isMainnetNetwork(network)) {
    if (!claimedPayer || !allowlist.has(claimedPayer)) {
      log.warn({
        event: "agent.not_allowed",
        request_id,
        network,
        agent_pubkey: claimedPayer ?? undefined,
      });
      return err("agent_not_allowed", 403, {
        detail: "payer is not on the operator mainnet allowlist",
      });
    }
  }

  // Facilitator selection — `useCdp` already resolved above when we
  // built the challenge, so the verify + settle below align on the
  // same facilitator as the fee-payer declaration.
  let facilitator;
  try {
    facilitator = useCdp ? await getCdpFacilitator() : await getFacilitator();
  } catch (e) {
    if (
      e instanceof FacilitatorNotConfiguredError ||
      e instanceof CdpFacilitatorNotConfiguredError
    ) {
      log.error({
        event: "chat.server_misconfigured",
        request_id,
        reason: useCdp
          ? "cdp_facilitator_unconfigured"
          : "facilitator_unconfigured",
        detail: e.message,
      });
      return err("server_misconfigured", 500, { detail: e.message });
    }
    log.error({
      event: "chat.facilitator_init_failed",
      request_id,
      via: useCdp ? "cdp" : "default",
      reason: e instanceof Error ? e.message : "unknown",
    });
    return err("facilitator_init_failed", 500, {
      detail: e instanceof Error ? e.message : "unknown",
    });
  }
  log.info({
    event: "chat.facilitator_selected",
    request_id,
    via: useCdp ? "cdp" : "default",
  });
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
      tx_signature: settled.transaction,
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

  // Debit the receipt fee from the agent's credit balance so the
  // burn-pool/treasury accrual is matched by a real ledger movement
  // (otherwise the agent ends up with the unburned fee as credit).
  // Best-effort: a failure here is logged but doesn't block the user
  // response — the call already settled on-chain.
  if (feeBreakdown.receiptFeeUsdc > 0) {
    try {
      await debit(supabase, {
        pubkey: payerWallet,
        usdc: feeBreakdown.receiptFeeUsdc,
        reason: "receipt_fee",
      });
    } catch (e) {
      log.error({
        event: "chat.fee_debit_failed",
        request_id,
        agent_pubkey: payerWallet,
        fee_usdc: feeBreakdown.receiptFeeUsdc,
        detail: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  const { data: logRow, error: logError } = await supabase
    .from("inference_logs")
    .insert({
      agent_pubkey: payerWallet,
      request_nonce: settled.transaction,
      tx_signature: settled.transaction,
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

  // Wire 1 Phase A — accrue the receipt fee to the burn pool. Idempotent
  // by tx_signature so a replayed settlement can't inflate the counter.
  // Best-effort: if the insert fails the user still gets their receipt.
  if (feeBreakdown.receiptFeeUsdc > 0) {
    const burnResult = await recordBurnPoolFee(supabase, {
      agentPubkey: payerWallet,
      breakdown: feeBreakdown,
      network,
      source: "chat-completions",
      txSignature: settled.transaction,
      inferenceId: logRow?.id ?? null,
    });
    if (burnResult.ok) {
      log.info({
        event: "burn_pool.recorded",
        request_id,
        agent_pubkey: payerWallet,
        source: "chat-completions",
        fee_usdc: feeBreakdown.receiptFeeUsdc,
        burn_pool_share_usdc: feeBreakdown.burnPoolShareUsdc,
        treasury_share_usdc: feeBreakdown.treasuryShareUsdc,
        tx_signature: settled.transaction,
      });
    } else if (burnResult.replay) {
      log.warn({
        event: "burn_pool.replay",
        request_id,
        agent_pubkey: payerWallet,
        tx_signature: settled.transaction,
      });
    } else {
      log.error({
        event: "burn_pool.write_failed",
        request_id,
        agent_pubkey: payerWallet,
        tx_signature: settled.transaction,
        detail: burnResult.error.message,
      });
    }
  }

  const { points_total: pointsTotal } = await getAgentStats(
    supabase,
    payerWallet
  );

  // Hash the canonical JSON of the messages array, NOT a delimited string.
  // A `:` or `\n` inside content can otherwise produce the same hash as a
  // structurally different message log — a verifier-bypass risk.
  const promptForHash = canonicalize(body.messages);
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
      // Wire 1 Phase A — surface the fee breakdown so verifiers
      // (and the public receipt page) can show inference + fee as
      // two line items. amount_usdc remains the total settled
      // on-chain; the new fields are additive and non-breaking.
      inference_usdc: feeBreakdown.inferenceUsdc,
      receipt_fee_usdc: feeBreakdown.receiptFeeUsdc,
      burn_pool_share_usdc: feeBreakdown.burnPoolShareUsdc,
      treasury_share_usdc: feeBreakdown.treasuryShareUsdc,
      tx_signature: settled.transaction,
      network,
      pay_to: recipient,
    },
  });

  // Persist the signed receipt onto the log row so public lookups at
  // /api/v1/receipts/<id> (and the /r/<id> permalink) return the same
  // signed JSON the client got — bit-stable, no re-signing on read.
  if (logRow?.id) {
    const { error: updateError } = await supabase
      .from("inference_logs")
      .update({ receipt_json: receipt })
      .eq("id", logRow.id);
    if (updateError) {
      log.error({
        event: "receipt_persist_failed",
        request_id,
        agent_pubkey: payerWallet,
        inference_id: logRow.id,
        tx_signature: settled.transaction,
        detail: updateError.message,
      });
    }
  }

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
