/**
 * x402 facilitator — verifies and settles signed Solana payments.
 *
 * Three modes behind one interface, selected by env:
 *   - LOCAL  — NEXUS_FACILITATOR_LOCAL=true → in-process facilitator
 *              built from NEXUS_DEPOSIT_SECRET_KEY (preferred default)
 *   - HTTP   — X402_FACILITATOR_URL set → wraps @x402/core's
 *              HTTPFacilitatorClient against that URL (CDP, etc.)
 *   - MOCK   — NEXUS_ALLOW_MOCK_FACILITATOR=true (and the others
 *              unset) → permissive mock for local dev only
 *
 * If none of the above is set, getFacilitator() throws
 * FacilitatorNotConfiguredError so the route fails closed in production
 * rather than silently accepting bogus payments.
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
import { getLocalFacilitator } from "./local-facilitator";

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
    const { SOLANA_DEVNET_CAIP2 } = await import("@x402/svm");
    return {
      kinds: [
        {
          x402Version: 2,
          scheme: "exact",
          network: SOLANA_DEVNET_CAIP2,
        },
      ],
      extensions: [],
      signers: {},
    };
  }
}

export class FacilitatorNotConfiguredError extends Error {
  constructor() {
    super(
      "No facilitator configured. Set NEXUS_FACILITATOR_LOCAL=true " +
        "(self-host) or X402_FACILITATOR_URL=<url> (remote), or in dev " +
        "set NEXUS_ALLOW_MOCK_FACILITATOR=true."
    );
    this.name = "FacilitatorNotConfiguredError";
  }
}

let cached: Promise<FacilitatorClient> | null = null;

export function getFacilitator(): Promise<FacilitatorClient> {
  if (cached) return cached;

  if (process.env.NEXUS_FACILITATOR_LOCAL?.trim() === "true") {
    cached = getLocalFacilitator();
    return cached;
  }

  const url = process.env.X402_FACILITATOR_URL?.trim();
  if (url) {
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
    cached = Promise.resolve(
      new HTTPFacilitatorClient({
        url,
        createAuthHeaders,
      })
    );
    return cached;
  }

  if (process.env.NEXUS_ALLOW_MOCK_FACILITATOR?.trim() === "true") {
    cached = Promise.resolve(new MockFacilitator());
    return cached;
  }

  cached = Promise.reject(new FacilitatorNotConfiguredError());
  // Don't cache the rejection — let the next call retry if env changed.
  const out = cached;
  cached = null;
  return out;
}

/** Test hook — reset the cached facilitator (used by tests). */
export function _resetFacilitatorCache(): void {
  cached = null;
}
