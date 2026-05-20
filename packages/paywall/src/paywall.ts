/**
 * `createPaywall` — framework-agnostic x402 paywall.
 *
 * Wraps the full lifecycle that lives today in
 * `apps/nexus/app/api/v1/chat/completions/route.ts`:
 *
 *     no payment       → 402 + base64 PaymentRequired challenge
 *     X-Payment header → verify → settle → onPaid → sign receipt → 200
 *
 * The adapters in `./adapters/*` are thin shims that translate framework
 * request/response objects to this executor's `PaywallRequest` /
 * `PaywallResult` shape. Anyone with a `fetch`-ish runtime can use the
 * core directly.
 */

import { createHash, randomUUID } from "node:crypto";
import type { PaymentPayload } from "@x402/core/types";
import {
  buildChallenge,
  resolveNetwork,
  extractPayerFromPayload,
} from "./challenge.js";
import {
  encodeHeader,
  decodeHeader,
  X402_PAYMENT_HEADER,
  X402_REQUIRED_HEADER,
  X402_RESPONSE_HEADER,
  NEXUS_RECEIPT_HEADER,
} from "./headers.js";
import { signReceipt } from "./receipts.js";
import { selectFacilitator } from "./facilitator.js";
import type {
  PaidContext,
  PaywallConfig,
  PaywallRequest,
  PaywallResult,
  PaywallLogger,
} from "./types.js";

const DEFAULT_MAX_USDC = 0.1;

export type PaywallExecutor = {
  execute: (req: PaywallRequest) => Promise<PaywallResult>;
};

export function createPaywall(config: PaywallConfig): PaywallExecutor {
  const log = config.logger ?? defaultLogger();
  const maxUsdc = config.maxCostUsdc ?? DEFAULT_MAX_USDC;
  const network = resolveNetwork(config.network);
  const facilitator = selectFacilitator(config.facilitator);

  if (config.amount > maxUsdc) {
    throw new Error(
      `paywall: amount (${config.amount}) exceeds maxCostUsdc (${maxUsdc})`
    );
  }

  async function resolveDiscountedAmount(payer: string | null): Promise<number> {
    if (!config.tokenDiscountBps) return config.amount;
    const bps = await config.tokenDiscountBps(payer);
    if (!Number.isFinite(bps) || bps <= 0) return config.amount;
    const capped = Math.min(bps, 10_000);
    return round6(config.amount * (1 - capped / 10_000));
  }

  async function execute(req: PaywallRequest): Promise<PaywallResult> {
    const t0 = Date.now();
    const request_id = req.headers["x-request-id"] ?? randomUUID();
    const paymentHeader = req.headers[X402_PAYMENT_HEADER] ?? null;

    log.info({
      event: "paywall.probe",
      request_id,
      has_payment_header: paymentHeader != null,
    });

    // Pre-payment we don't know the payer yet — discount falls back to no-op
    // unless tokenDiscountBps accepts null (it does in our signature). The
    // challenge advertises the discounted amount; we re-derive the same
    // discount at verify-time so the payer and challenge agree.
    const challengePayer = paymentHeader
      ? extractPayerFromPayload(
          decodeHeader<PaymentPayload>(paymentHeader) ?? ({ payload: {} } as PaymentPayload)
        )
      : null;
    const amount = await resolveDiscountedAmount(challengePayer);

    if (!paymentHeader) {
      const challenge = buildChallenge({
        amountUsdc: amount,
        payTo: config.recipient,
        network,
        resource: {
          url: config.resource?.url ?? req.url,
          description: config.resource?.description ?? "Paid API call",
          serviceName: config.resource?.serviceName ?? "vdm-paywall",
          mimeType: "application/json",
        },
      });
      log.info({
        event: "paywall.challenge_issued",
        request_id,
        amount_usdc: amount,
        network,
      });
      return {
        kind: "challenge",
        status: 402,
        headers: {
          "content-type": "application/json",
          [X402_REQUIRED_HEADER]: encodeHeader(challenge),
        },
        body: { ok: false, error: "payment_required", challenge },
      };
    }

    const payload = decodeHeader<PaymentPayload>(paymentHeader);
    if (!payload) {
      log.warn({ event: "paywall.payment_malformed", request_id });
      return jsonErr(request_id, "payment_malformed", 402, {
        detail: "X-Payment header is not valid base64 JSON",
      });
    }

    const payer = extractPayerFromPayload(payload);
    if (!payer) {
      log.warn({ event: "paywall.payment_missing_payer", request_id });
      return jsonErr(request_id, "payment_missing_payer", 402);
    }

    if (config.allowedPayers && !config.allowedPayers.has(payer)) {
      log.warn({ event: "paywall.agent_not_allowed", request_id, payer });
      return jsonErr(request_id, "agent_not_allowed", 403, {
        detail: "payer is not on the operator allowlist",
      });
    }

    if (config.loopDetection) {
      const loop = await config.loopDetection(payer, req.body);
      if (loop) {
        log.warn({ event: "paywall.loop_detected", request_id, payer });
        return jsonErr(request_id, "loop_detected", 429, {
          detail: "payer rejected by loop-detection hook",
        });
      }
    }

    const requirement = buildChallenge({
      amountUsdc: amount,
      payTo: config.recipient,
      network,
      resource: {
        url: req.url,
        description: "Paid API call",
        serviceName: "vdm-paywall",
        mimeType: "application/json",
      },
    }).accepts[0]!;

    let verified;
    try {
      verified = await facilitator.verify(payload, requirement);
    } catch (e) {
      const reason = e instanceof Error ? e.message : "verify_threw";
      log.error({ event: "paywall.verify_failed", request_id, payer, reason });
      return jsonErr(request_id, "facilitator_unreachable", 502, { detail: reason });
    }
    if (!verified.isValid) {
      const reason = verified.invalidReason ?? verified.invalidMessage ?? "invalid";
      log.warn({ event: "paywall.verify_failed", request_id, payer, reason });
      return jsonErr(request_id, "payment_invalid", 402, { detail: reason });
    }

    let settled;
    try {
      settled = await facilitator.settle(payload, requirement);
    } catch (e) {
      const reason = e instanceof Error ? e.message : "settle_threw";
      log.error({ event: "paywall.settle_failed", request_id, payer, reason });
      return jsonErr(request_id, "facilitator_unreachable", 502, { detail: reason });
    }
    if (!settled.success) {
      const reason = settled.errorReason ?? settled.errorMessage ?? "failed";
      log.warn({ event: "paywall.settle_failed", request_id, payer, reason });
      return jsonErr(request_id, "payment_failed", 402, { detail: reason });
    }

    const txSignature = settled.transaction;
    const settledPayer = settled.payer ?? verified.payer ?? payer;
    log.info({
      event: "paywall.settled",
      request_id,
      payer: settledPayer,
      tx_signature: txSignature,
    });

    let paid;
    try {
      const staking_multiplier = config.stakingMultiplier
        ? await config.stakingMultiplier(settledPayer)
        : 1;
      const ctx: PaidContext = {
        payer: settledPayer,
        txSignature,
        amount_usdc: amount,
        body: req.body,
        headers: req.headers,
        staking_multiplier,
      };
      paid = await config.onPaid(ctx);
    } catch (e) {
      const reason = e instanceof Error ? e.message : "handler_error";
      log.error({
        event: "paywall.handler_failed",
        request_id,
        payer: settledPayer,
        reason,
      });
      return jsonErr(request_id, "handler_error", 502, { detail: reason });
    }

    const receipt = signReceipt(
      {
        ...(paid.extra ?? {}),
        v: 2 as const,
        agent_pubkey: settledPayer,
        upstream: paid.upstream ?? "paywall",
        model: paid.model,
        cost_usdc: paid.cost_usdc ?? amount,
        prompt_hash: sha256Hex(paid.promptForHash),
        response_hash: sha256Hex(paid.responseForHash),
        timestamp: Date.now(),
        inference_id: null,
        points_total: 0,
        payment: {
          scheme: "x402" as const,
          amount_usdc: amount,
          tx_signature: txSignature,
          network,
          pay_to: config.recipient,
        },
      },
      config.operatorSecretKey
    );

    if (config.cashbackEnabled && config.cashbackBps && config.cashbackBps > 0) {
      log.info({
        event: "paywall.cashback_owed",
        request_id,
        payer: settledPayer,
        amount_usdc: amount,
        cashback_bps: config.cashbackBps,
        cashback_usdc_equivalent: round6((amount * config.cashbackBps) / 10_000),
        tx_signature: txSignature,
      });
    }

    log.info({
      event: "paywall.ok",
      request_id,
      payer: settledPayer,
      latency_ms: Date.now() - t0,
    });

    return {
      kind: "paid",
      status: 200,
      headers: {
        "content-type": "application/json",
        [NEXUS_RECEIPT_HEADER]: encodeHeader(receipt),
        [X402_RESPONSE_HEADER]: encodeHeader({
          status: "settled",
          txSignature,
          network,
        }),
      },
      body: paid.response,
    };
  }

  return { execute };
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function jsonErr(
  request_id: string,
  error: string,
  status: number,
  extra: Record<string, unknown> = {}
): PaywallResult {
  return {
    kind: "error",
    status,
    headers: { "content-type": "application/json" },
    body: { ok: false, error, request_id, ...extra },
  };
}

function defaultLogger(): PaywallLogger {
  const emit = (level: string, fields: Record<string, unknown>) => {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      ...fields,
    });
    if (level === "error") console.error(line);
    else console.log(line);
  };
  return {
    info: (f) => emit("info", f),
    warn: (f) => emit("warn", f),
    error: (f) => emit("error", f),
  };
}
