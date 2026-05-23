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
import { generateCdpJwt } from "./cdp-jwt";

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
 * Env (two supported auth modes — pick one):
 *
 *   **JWT mode (CDP's modern Secret API Keys — recommended).**
 *     - `CDP_FACILITATOR_KEY_NAME`    full "organizations/<org>/apiKeys/<key>"
 *     - `CDP_FACILITATOR_PRIVATE_KEY` PKCS#8 PEM ("-----BEGIN PRIVATE KEY-----")
 *       contents. Either real newlines or `\n` escapes work — Vercel
 *       collapses them and we restore.
 *
 *   **Bearer mode (legacy single-string token).**
 *     - `CDP_FACILITATOR_API_KEY` single bearer string
 *
 *   `CDP_FACILITATOR_URL` overrides the endpoint
 *   (default: https://api.cdp.coinbase.com/platform/v2/x402).
 *
 * Per CDP API auth docs: JWTs are signed with the key's private key
 * (ES256 for P-256, EdDSA for Ed25519 — auto-detected). Each request
 * gets a fresh 120s-bound token whose `uri` claim covers the exact
 * (method, host, path) tuple being called.
 */
export class CdpFacilitatorNotConfiguredError extends Error {
  constructor() {
    super(
      "CDP facilitator not configured. Set CDP_FACILITATOR_KEY_NAME + " +
        "CDP_FACILITATOR_PRIVATE_KEY (Secret API Key, recommended) or " +
        "CDP_FACILITATOR_API_KEY (legacy bearer) to enable the ?via=cdp route."
    );
    this.name = "CdpFacilitatorNotConfiguredError";
  }
}

const CDP_DEFAULT_URL = "https://api.cdp.coinbase.com/platform/v2/x402";

type CdpAuthMode =
  | { kind: "jwt"; keyName: string; privateKey: string }
  | { kind: "bearer"; token: string };

function resolveCdpAuth(): CdpAuthMode | null {
  const keyName = process.env.CDP_FACILITATOR_KEY_NAME?.trim();
  const privateKey = process.env.CDP_FACILITATOR_PRIVATE_KEY?.trim();
  if (keyName && privateKey) {
    return { kind: "jwt", keyName, privateKey };
  }
  const token = process.env.CDP_FACILITATOR_API_KEY?.trim();
  if (token) return { kind: "bearer", token };
  return null;
}

export function getCdpFacilitator(): Promise<FacilitatorClient> {
  if (cdpCached) return cdpCached;
  const auth = resolveCdpAuth();
  if (!auth) {
    // Don't cache the rejection — let the next call retry if env changed.
    return Promise.reject(new CdpFacilitatorNotConfiguredError());
  }
  const url = process.env.CDP_FACILITATOR_URL?.trim() || CDP_DEFAULT_URL;
  const cdpHost = new URL(url).host;
  const basePath = new URL(url).pathname.replace(/\/$/, "");

  // CDP exposes three endpoints under the facilitator base path. We
  // sign a JWT per (method, path) tuple every time HTTPFacilitatorClient
  // asks for auth headers — fresh tokens, no caching past their 120s
  // validity window.
  const endpoints = {
    verify:    { method: "POST" as const, path: `${basePath}/verify` },
    settle:    { method: "POST" as const, path: `${basePath}/settle` },
    supported: { method: "GET"  as const, path: `${basePath}/supported` },
  };

  const createAuthHeaders = async () => {
    if (auth.kind === "bearer") {
      const headers = { Authorization: `Bearer ${auth.token}` };
      return { verify: headers, settle: headers, supported: headers };
    }
    const [verifyJwt, settleJwt, supportedJwt] = await Promise.all([
      generateCdpJwt({
        keyName: auth.keyName,
        privateKey: auth.privateKey,
        method: endpoints.verify.method,
        host: cdpHost,
        path: endpoints.verify.path,
      }),
      generateCdpJwt({
        keyName: auth.keyName,
        privateKey: auth.privateKey,
        method: endpoints.settle.method,
        host: cdpHost,
        path: endpoints.settle.path,
      }),
      generateCdpJwt({
        keyName: auth.keyName,
        privateKey: auth.privateKey,
        method: endpoints.supported.method,
        host: cdpHost,
        path: endpoints.supported.path,
      }),
    ]);
    return {
      verify:    { Authorization: `Bearer ${verifyJwt}` },
      settle:    { Authorization: `Bearer ${settleJwt}` },
      supported: { Authorization: `Bearer ${supportedJwt}` },
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
