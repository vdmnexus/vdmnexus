/**
 * x402 facilitator — verifies and settles signed Solana payments.
 *
 * Two implementations behind one interface:
 *   - MockFacilitator: dev-only, always returns success with a synthetic
 *     tx signature. Active when X402_FACILITATOR_URL is unset.
 *   - HttpFacilitator: wraps the canonical HTTPFacilitatorClient from
 *     @x402/core. Active when X402_FACILITATOR_URL is set.
 *
 * Default suggested URLs:
 *   - https://x402.org/facilitator                  ← free, devnet, no auth
 *   - https://api.cdp.coinbase.com/platform/v2/x402 ← Coinbase CDP, paid
 */

import { randomUUID } from "node:crypto";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { FacilitatorClient } from "@x402/core/server";
import type {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  SupportedResponse,
  VerifyResponse,
} from "@x402/core/types";

class MockFacilitator implements FacilitatorClient {
  async verify(
    _payload: PaymentPayload,
    _requirements: PaymentRequirements
  ): Promise<VerifyResponse> {
    const payer = (
      (_payload.payload as { payer?: string } | undefined)?.payer ?? ""
    ).trim();
    return { isValid: true, payer };
  }

  async settle(
    payload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<SettleResponse> {
    const payer = (
      (payload.payload as { payer?: string } | undefined)?.payer ?? ""
    ).trim();
    return {
      success: true,
      transaction: `MOCK_${randomUUID()}`,
      network: requirements.network,
      amount: requirements.amount,
      payer,
    };
  }

  async getSupported(): Promise<SupportedResponse> {
    return {
      kinds: [
        {
          x402Version: 2,
          scheme: "exact",
          network: "solana:devnet",
        },
      ],
      extensions: [],
      signers: {},
    };
  }
}

let cached: FacilitatorClient | null = null;

/**
 * Returned by getFacilitator() when no facilitator is configured AND mock
 * is not explicitly enabled. Surfaces a clear server_misconfigured error
 * instead of silently letting the MockFacilitator accept bogus payments.
 */
export class FacilitatorNotConfiguredError extends Error {
  constructor() {
    super(
      "X402_FACILITATOR_URL is not set and NEXUS_ALLOW_MOCK_FACILITATOR is not 'true'. " +
        "Refusing to use MockFacilitator without an explicit opt-in."
    );
    this.name = "FacilitatorNotConfiguredError";
  }
}

export function getFacilitator(): FacilitatorClient {
  if (cached) return cached;
  const url = process.env.X402_FACILITATOR_URL?.trim();

  if (!url) {
    if (process.env.NEXUS_ALLOW_MOCK_FACILITATOR?.trim() === "true") {
      cached = new MockFacilitator();
      return cached;
    }
    throw new FacilitatorNotConfiguredError();
  }

  const apiKey = process.env.X402_FACILITATOR_API_KEY?.trim();
  const createAuthHeaders = apiKey
    ? async () => {
        const headers = { Authorization: `Bearer ${apiKey}` };
        return {
          verify: headers,
          settle: headers,
          supported: headers,
        };
      }
    : undefined;

  cached = new HTTPFacilitatorClient({
    url,
    createAuthHeaders,
  });
  return cached;
}

/** Test hook — reset the cached facilitator (used by tests). */
export function _resetFacilitatorCache(): void {
  cached = null;
}
