/**
 * X402Agent — an Agent that pays per call via x402.
 *
 * Extends the base `Agent` from `@vdm-nexus/sdk`, so callers can still use
 * the prepaid `.inference()` flow if they want. Adds `.payAndInfer()` for
 * the x402-gated `/chat/completions` flow.
 *
 * The Ed25519 secret that already lives on `Agent` IS the Solana secret —
 * same scheme, 32-byte seed plus 32-byte public key concatenated. We adapt
 * it to a `@solana/kit` `TransactionSigner` and let `@x402/svm`'s
 * `ExactSvmScheme` build the signed SPL USDC transfer payload.
 */

import bs58 from "bs58";
import { Agent } from "@vdm-nexus/sdk";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { x402Client } from "@x402/core/client";
import type {
  PaymentPayload,
  PaymentRequired,
} from "@x402/core/types";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { toClientSvmSigner } from "@x402/svm";
import type {
  SirX402,
  X402ChatRequest,
  X402ChatResponse,
  X402PaymentResponse,
  OpenAIChatCompletion,
} from "./types.js";

const PAYMENT_HEADER = "x-payment";
const PAYMENT_REQUIRED_HEADER = "x-payment-required";
const PAYMENT_RESPONSE_HEADER = "x-payment-response";
const RECEIPT_HEADER = "x-nexus-receipt";

export class X402PaymentRequiredError extends Error {
  readonly status: number;
  readonly detail?: string;
  constructor(detail?: string, status = 402) {
    super(`x402_payment_invalid: ${detail ?? "unknown"}`);
    this.name = "X402PaymentRequiredError";
    this.status = status;
    this.detail = detail;
  }
}

export class X402PaymentReplayError extends Error {
  constructor() {
    super("x402_payment_replay");
    this.name = "X402PaymentReplayError";
  }
}

export class X402UpstreamError extends Error {
  readonly status: number;
  readonly detail?: string;
  constructor(detail: string | undefined, status: number) {
    super(`x402_upstream_error: ${detail ?? "unknown"}`);
    this.name = "X402UpstreamError";
    this.status = status;
    this.detail = detail;
  }
}

function decodeHeader<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    const json = Buffer.from(value, "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function encodeHeader(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

export type X402AgentOptions = {
  /**
   * Custom Solana RPC URL used when building SPL transfer payloads.
   * Defaults to whichever endpoint `@x402/svm` falls back to per network
   * (the public `api.mainnet-beta.solana.com`, which is aggressively
   * rate-limited). Pass a Helius / Triton / QuickNode URL when running
   * mainnet flows from a public network, otherwise `payAndInfer` may
   * fail with a `429 Too Many Requests` on the mint lookup.
   *
   * If unset, also reads the `SOLANA_RPC_URL` env var so server-side
   * callers can configure it without touching the agent constructor.
   */
  rpcUrl?: string;
};

export class X402Agent extends Agent {
  private _x402: x402Client | null = null;
  private readonly _rpcUrl: string | undefined;

  constructor(secretKey: Uint8Array, options: X402AgentOptions = {}) {
    super(secretKey);
    this._rpcUrl =
      options.rpcUrl?.trim() || process.env.SOLANA_RPC_URL?.trim() || undefined;
  }

  /** Create a fresh agent with a new Ed25519 keypair. */
  static override generate(options?: X402AgentOptions): X402Agent {
    const base = Agent.generate();
    return new X402Agent(base.secretKey, options);
  }

  /** Restore an agent from its base58-encoded 64-byte secret. */
  static override fromBase58(
    secretKeyBase58: string,
    options?: X402AgentOptions
  ): X402Agent {
    return new X402Agent(bs58.decode(secretKeyBase58), options);
  }

  private async getClient(): Promise<x402Client> {
    if (this._x402) return this._x402;
    const kitSigner = await createKeyPairSignerFromBytes(this.secretKey);
    const signer = toClientSvmSigner(kitSigner);
    const client = new x402Client();
    // Register the scheme directly (bypassing `registerExactSvmScheme`
    // which doesn't expose the rpcUrl). When `_rpcUrl` is unset the
    // scheme falls back to @x402/svm's per-network defaults, matching
    // the previous behaviour.
    const config = this._rpcUrl ? { rpcUrl: this._rpcUrl } : undefined;
    client.register("solana:*", new ExactSvmScheme(signer, config));
    this._x402 = client;
    return client;
  }

  /**
   * Build a signed x402 payment payload from a challenge the caller has
   * already obtained (e.g. via a custom probe loop).
   *
   * Exposed so framework adapters (`@vdm-nexus/ai-sdk-provider`,
   * `@vdm-nexus/mastra-provider`) can run the handshake against a body
   * they constructed themselves without `payAndInfer` reissuing the probe.
   */
  async buildPaymentPayload(
    challenge: PaymentRequired
  ): Promise<PaymentPayload> {
    const client = await this.getClient();
    return client.createPaymentPayload(challenge);
  }

  /**
   * Pay-per-call inference against an x402-gated `/chat/completions`
   * endpoint. Does the two-roundtrip x402 handshake transparently:
   *
   *   1. POST with no payment header → 402 + X-Payment-Required
   *   2. Build + sign an SPL USDC transfer for the declared payTo
   *   3. POST again with X-Payment → OpenAI body + signed receipt
   *
   * @param endpoint Base URL up to `/api/v1` (no trailing slash needed)
   * @param opts     `{ model, messages }` — OpenAI chat completions shape
   */
  async payAndInfer(
    endpoint: string,
    opts: X402ChatRequest
  ): Promise<X402ChatResponse> {
    const base = endpoint.replace(/\/$/, "");
    const query = opts.via ? `?via=${encodeURIComponent(opts.via)}` : "";
    const url = `${base}/chat/completions${query}`;
    const requestBody = JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      // Per-call network override. Omitted → server falls back to its
      // X402_NETWORK default. Set → server uses the named network for
      // both the 402 challenge and settlement, regardless of default.
      ...(opts.network ? { network: opts.network } : {}),
    });

    // 1. Probe.
    const probe = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    if (probe.status !== 402) {
      const text = await probe.text();
      throw new X402UpstreamError(
        `expected 402 on probe, got ${probe.status}: ${text.slice(0, 200)}`,
        probe.status
      );
    }

    const challenge =
      decodeHeader<PaymentRequired>(probe.headers.get(PAYMENT_REQUIRED_HEADER)) ??
      (await (async () => {
        const body = (await probe.json()) as { challenge?: PaymentRequired };
        return body.challenge ?? null;
      })());
    if (!challenge) {
      throw new X402UpstreamError(
        "402 response had no X-Payment-Required header or body challenge",
        402
      );
    }

    // 2. Build the signed payment via @x402/svm.
    const client = await this.getClient();
    const payment: PaymentPayload = await client.createPaymentPayload(challenge);

    // 3. Pay.
    const paid = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [PAYMENT_HEADER]: encodeHeader(payment),
      },
      body: requestBody,
    });

    if (paid.status === 409) {
      throw new X402PaymentReplayError();
    }
    if (paid.status === 402) {
      const errBody = (await paid.json().catch(() => ({}))) as {
        detail?: string;
      };
      throw new X402PaymentRequiredError(errBody.detail);
    }
    if (!paid.ok) {
      const errBody = (await paid.json().catch(() => ({}))) as {
        detail?: string;
      };
      throw new X402UpstreamError(errBody.detail, paid.status);
    }

    const openai = (await paid.json()) as OpenAIChatCompletion;
    // Chat-completion receipts are always the x402 variant.
    const receipt = decodeHeader<SirX402>(paid.headers.get(RECEIPT_HEADER));
    const payment_response = decodeHeader<X402PaymentResponse>(
      paid.headers.get(PAYMENT_RESPONSE_HEADER)
    );

    return {
      openai,
      receipt,
      payment: payment_response,
    };
  }
}
