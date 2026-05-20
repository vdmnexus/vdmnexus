/**
 * Facilitator selector for the paywall.
 *
 * Three modes:
 *   - `http`   — wraps `@x402/core`'s HTTPFacilitatorClient. Suitable for
 *                CDP, Nexus's hosted facilitator at /x402, or any
 *                self-hosted instance.
 *   - `mock`   — permissive in-process mock. Verifies anything and emits
 *                synthetic `MOCK_<uuid>` transaction signatures. Dev only.
 *   - `custom` — caller supplies a `FacilitatorClient` they constructed
 *                themselves. Escape hatch for advanced setups (e.g.
 *                self-hosted with KMS — mirror `apps/nexus`'s pattern).
 *
 * We deliberately do *not* embed the local SVM signer here. That path
 * needs AWS KMS or an in-memory keypair which would balloon the package's
 * dependency surface for builders who just want to point at an existing
 * facilitator URL. Use `mode: "custom"` if you want it.
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

export type { FacilitatorClient };

export type FacilitatorOption =
  | { mode: "http"; url: string; apiKey?: string }
  | { mode: "mock" }
  | { mode: "custom"; client: FacilitatorClient };

export class MockFacilitator implements FacilitatorClient {
  async verify(
    payload: PaymentPayload,
    _requirements: PaymentRequirements
  ): Promise<VerifyResponse> {
    const payer = (
      (payload.payload as { payer?: string } | undefined)?.payer ?? ""
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
      kinds: [{ x402Version: 2, scheme: "exact", network: SOLANA_DEVNET_CAIP2 }],
      extensions: [],
      signers: {},
    };
  }
}

export function selectFacilitator(opt: FacilitatorOption): FacilitatorClient {
  if (opt.mode === "custom") return opt.client;
  if (opt.mode === "mock") return new MockFacilitator();
  const apiKey = opt.apiKey?.trim();
  const createAuthHeaders = apiKey
    ? async () => {
        const headers = { Authorization: `Bearer ${apiKey}` };
        return { verify: headers, settle: headers, supported: headers };
      }
    : undefined;
  return new HTTPFacilitatorClient({ url: opt.url, createAuthHeaders });
}
