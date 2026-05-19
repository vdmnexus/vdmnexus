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
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { toClientSvmSigner } from "@x402/svm";
import type {
  NexusReceipt,
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

export class X402Agent extends Agent {
  private _x402: x402Client | null = null;

  /** Create a fresh agent with a new Ed25519 keypair. */
  static override generate(): X402Agent {
    const base = Agent.generate();
    return new X402Agent(base.secretKey);
  }

  /** Restore an agent from its base58-encoded 64-byte secret. */
  static override fromBase58(secretKeyBase58: string): X402Agent {
    return new X402Agent(bs58.decode(secretKeyBase58));
  }

  private async getClient(): Promise<x402Client> {
    if (this._x402) return this._x402;
    const kitSigner = await createKeyPairSignerFromBytes(this.secretKey);
    const signer = toClientSvmSigner(kitSigner);
    const client = new x402Client();
    registerExactSvmScheme(client, { signer });
    this._x402 = client;
    return client;
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
    const url = `${base}/chat/completions`;
    const requestBody = JSON.stringify({
      model: opts.model,
      messages: opts.messages,
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
    const receipt = decodeHeader<NexusReceipt>(paid.headers.get(RECEIPT_HEADER));
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
