/**
 * x402 facilitator — verifies and settles signed Solana payments.
 *
 * Three modes behind one interface, selected by env:
 *   - LOCAL  — NEXUS_FACILITATOR_LOCAL=true → in-process facilitator.
 *              Signs via AWS KMS when NEXUS_KMS_KEY_ID is set (preferred
 *              for production), else falls back to NEXUS_DEPOSIT_SECRET_KEY.
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
let cdpCached: Promise<FacilitatorClient> | null = null;

/**
 * CDP facilitator — used for the Bazaar-indexed route variant.
 *
 * Distinct from `getFacilitator()` because the route picks per-request:
 * default traffic goes through whatever the operator configured
 * (`NEXUS_FACILITATOR_LOCAL` or `X402_FACILITATOR_URL`), while
 * `?via=cdp` traffic is forced through Coinbase's facilitator so it
 * shows up in the x402 Bazaar / Agentic.Market index. CDP indexing is
 * keyed off settlements processed by their facilitator — not via a
 * submission form — so the only way to land on those surfaces is to
 * route at least some real paid calls through `api.cdp.coinbase.com`.
 *
 * MiCA note: settling through CDP keeps Nexus in the merchant role —
 * CDP is the third-party settler, not us. Same role we'd be in with
 * any other remote facilitator. This is materially safer than running
 * our own facilitator for third-party flows.
 *
 * Env:
 *   - `CDP_FACILITATOR_URL`  (defaults to https://api.cdp.coinbase.com/platform/v2/x402)
 *   - `CDP_FACILITATOR_API_KEY` (required — CDP rejects unauthenticated
 *     callers)
 */
export class CdpFacilitatorNotConfiguredError extends Error {
  constructor() {
    super(
      "CDP facilitator not configured. Set CDP_FACILITATOR_API_KEY " +
        "(and optionally CDP_FACILITATOR_URL) to enable the ?via=cdp route."
    );
    this.name = "CdpFacilitatorNotConfiguredError";
  }
}

const CDP_DEFAULT_URL = "https://api.cdp.coinbase.com/platform/v2/x402";

export function getCdpFacilitator(): Promise<FacilitatorClient> {
  if (cdpCached) return cdpCached;
  const apiKey = process.env.CDP_FACILITATOR_API_KEY?.trim();
  if (!apiKey) {
    const rejected = Promise.reject(new CdpFacilitatorNotConfiguredError());
    // Don't cache the rejection — let the next call retry if env changed.
    return rejected;
  }
  const url = process.env.CDP_FACILITATOR_URL?.trim() || CDP_DEFAULT_URL;
  const createAuthHeaders = async () => {
    const headers = { Authorization: `Bearer ${apiKey}` };
    return {
      verify: headers,
      settle: headers,
      supported: headers,
    };
  };
  cdpCached = Promise.resolve(
    new HTTPFacilitatorClient({
      url,
      createAuthHeaders,
    })
  );
  return cdpCached;
}

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
  cdpCached = null;
}
