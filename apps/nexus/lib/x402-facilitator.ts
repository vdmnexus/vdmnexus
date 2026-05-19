/**
 * x402 facilitator — verifies and settles signed Solana payments.
 *
 * Day 1: MockFacilitator only. CdpFacilitator is a TODO stub; wire on day 2.
 *
 * Selection is env-driven via X402_FACILITATOR_URL:
 *   - empty / unset → MockFacilitator (dev only)
 *   - set           → CdpFacilitator (real Coinbase CDP endpoint)
 */

import { randomUUID } from "node:crypto";
import type {
  X402PaymentOption,
  X402PaymentPayload,
} from "./x402";

export type VerifyResult = { ok: true } | { ok: false; error: string };
export type SettleResult =
  | { ok: true; txSignature: string }
  | { ok: false; error: string };

export interface Facilitator {
  verify(
    payload: X402PaymentPayload,
    requirement: X402PaymentOption
  ): Promise<VerifyResult>;
  settle(
    payload: X402PaymentPayload,
    requirement: X402PaymentOption
  ): Promise<SettleResult>;
}

class MockFacilitator implements Facilitator {
  async verify(): Promise<VerifyResult> {
    return { ok: true };
  }
  async settle(): Promise<SettleResult> {
    return { ok: true, txSignature: `MOCK_${randomUUID()}` };
  }
}

class CdpFacilitator implements Facilitator {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string | undefined
  ) {}

  async verify(): Promise<VerifyResult> {
    return { ok: false, error: "cdp_facilitator_not_wired_yet" };
  }
  async settle(): Promise<SettleResult> {
    return { ok: false, error: "cdp_facilitator_not_wired_yet" };
  }
}

let cached: Facilitator | null = null;

export function getFacilitator(): Facilitator {
  if (cached) return cached;
  const url = process.env.X402_FACILITATOR_URL?.trim();
  if (!url) {
    cached = new MockFacilitator();
  } else {
    cached = new CdpFacilitator(url, process.env.X402_FACILITATOR_API_KEY);
  }
  return cached;
}

/** Test hook — reset the cached facilitator (used by tests). */
export function _resetFacilitatorCache(): void {
  cached = null;
}
