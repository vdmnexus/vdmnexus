/**
 * E2E demo: a Mastra Agent powered by VDM Nexus, paying per call.
 *
 * Usage:
 *
 *   AGENT_SECRET_KEY=<base58 64-byte secret> \
 *   NEXUS_ENDPOINT=https://nexus.vdmnexus.com/api/v1 \
 *   NEXUS_NETWORK=solana:mainnet \
 *     pnpm --filter @vdm-nexus/mastra-provider exec tsx examples/agent.ts
 *
 * Requires `@mastra/core` installed in the example workspace. The agent's
 * Solana wallet (the public key derived from AGENT_SECRET_KEY) must hold
 * enough USDC on mainnet to cover the 0.01 USDC per-call x402 challenge.
 */

import { Agent } from "@mastra/core/agent";
import { nexusModel } from "../src/index.js";

const secretKey = process.env.AGENT_SECRET_KEY;
if (!secretKey) {
  console.error("AGENT_SECRET_KEY is required.");
  process.exit(1);
}

const endpoint = process.env.NEXUS_ENDPOINT ?? "https://nexus.vdmnexus.com/api/v1";
const network = process.env.NEXUS_NETWORK ?? "solana:mainnet";

const researcher = new Agent({
  name: "Researcher",
  instructions: "Answer in one sentence.",
  model: nexusModel({
    secretKey,
    endpoint,
    network,
    model: "openai/gpt-4o-mini",
  }),
});

async function main() {
  const result = await researcher.generate("Explain signed inference in one sentence.");
  console.log(result.text);

  // Mastra preserves AI SDK provider metadata on its `generate` result.
  const meta = (result as unknown as {
    providerMetadata?: { nexus?: { receipt?: { inference_id?: number; payment?: { tx_signature?: string } } } };
  }).providerMetadata?.nexus;
  if (meta?.receipt) {
    console.log(`receipt: https://vdmnexus.com/r/${meta.receipt.inference_id}`);
    console.log(`tx: https://solscan.io/tx/${meta.receipt.payment?.tx_signature}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
