/**
 * E2E demo: pay-per-call inference against mainnet via the Vercel AI SDK.
 *
 * Usage:
 *
 *   AGENT_SECRET_KEY=<base58 64-byte secret> \
 *   NEXUS_ENDPOINT=https://nexus.vdmnexus.com/api/v1 \
 *   NEXUS_NETWORK=solana:mainnet \
 *     pnpm --filter @vdm-nexus/ai-sdk-provider exec tsx examples/generate-text.ts
 *
 * The agent's Solana wallet must hold enough USDC (mainnet) to cover the
 * 0.01 USDC per-call x402 challenge. Generate a key + fund it via the
 * playground: https://vdmnexus.com/playground
 */

import { generateText } from "ai";
import { createNexus } from "../src/index.js";

const secretKey = process.env.AGENT_SECRET_KEY;
if (!secretKey) {
  console.error(
    "AGENT_SECRET_KEY is required (base58 64-byte tweetnacl secret)."
  );
  process.exit(1);
}

const endpoint = process.env.NEXUS_ENDPOINT ?? "https://nexus.vdmnexus.com/api/v1";
const network = process.env.NEXUS_NETWORK ?? "solana:mainnet";

const nexus = createNexus({ secretKey, endpoint, network });

async function main() {
  const result = await generateText({
    model: nexus("openai/gpt-4o-mini"),
    prompt: "Explain signed inference in one sentence.",
  });

  console.log(result.text);

  const meta = result.providerMetadata?.nexus as
    | { receipt?: { inference_id?: number; payment?: { tx_signature?: string } } }
    | undefined;
  const receipt = meta?.receipt;
  if (receipt) {
    console.log(`receipt id: ${receipt.inference_id}`);
    console.log(`receipt url: https://vdmnexus.com/r/${receipt.inference_id}`);
    console.log(`tx: https://solscan.io/tx/${receipt.payment?.tx_signature}`);
  } else {
    console.log("no receipt — endpoint did not gate this call.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
