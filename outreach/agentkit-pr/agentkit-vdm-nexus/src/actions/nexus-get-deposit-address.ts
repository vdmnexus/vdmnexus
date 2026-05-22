/**
 * `nexus_get_deposit_address` action — discover the on-chain destination
 * the agent should send USDC to in order to top up its prepaid credit
 * balance on a Nexus deployment.
 *
 * Wraps `GET /api/v1/deposit-address`. This is the off-band funding path
 * for agents that prefer batching deposits over per-call x402 settlement
 * (the credit ledger amortizes RPC + facilitator overhead across N calls).
 * Per-call x402 via `nexus_chat` does NOT require this — it settles
 * inline.
 */

import { z } from "zod";

export const NexusGetDepositAddressSchema = z
  .object({
    network: z
      .string()
      .optional()
      .describe(
        'Optional CAIP-2 network override (e.g. "solana:mainnet", "eip155:8453"). Omit to use the endpoint default.',
      ),
  })
  .describe(
    "Returns the USDC deposit address agents should send funds to in order to top up their prepaid credit balance on a Nexus deployment.",
  );

export type NexusDepositAddressResponse = {
  address: string;
  mint: string;
  network: string;
};

export async function executeNexusGetDepositAddress(
  endpoint: string,
  args: z.infer<typeof NexusGetDepositAddressSchema>,
): Promise<string> {
  const base = endpoint.replace(/\/$/, "");
  const qs = args.network ? `?network=${encodeURIComponent(args.network)}` : "";
  const url = `${base}/deposit-address${qs}`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      return JSON.stringify({
        ok: false,
        error: "deposit_address_fetch_failed",
        status: r.status,
      });
    }
    const body = (await r.json()) as NexusDepositAddressResponse;
    return JSON.stringify({
      ok: true,
      address: body.address,
      mint: body.mint,
      network: body.network,
    });
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: "deposit_address_fetch_failed",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
