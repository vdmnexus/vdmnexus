/**
 * One-shot end-to-end test for the x402-gated /chat/completions route.
 * Runs payAndInfer against the given endpoint, then verifyReceipt against
 * the returned receipt. Prints the settled tx URL and all five
 * verification checks.
 *
 *   pnpm tsx apps/nexus/scripts/test-payinfer.ts
 *
 * Env:
 *   NEXUS_ENDPOINT          base URL, e.g. https://nexus-preview-xyz.vercel.app
 *                           (default: http://localhost:3001)
 *   DEMO_AGENT_SECRET_KEY   base58 64-byte secret of a USDC-funded devnet
 *                           agent. faucet.circle.com gives ~10 USDC at a
 *                           time. Required — script aborts if absent so
 *                           we never silently use a fresh empty key.
 *
 * Sanity-check before running:
 *   curl ${NEXUS_ENDPOINT}/api/v1/deposit-address     → expect new address
 *   curl ${NEXUS_ENDPOINT}/api/v1/operator-key        → expect operator pubkey
 */

import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

import { X402Agent, verifyReceipt } from "../../../packages/x402/dist/index.js";

const ENDPOINT = process.env.NEXUS_ENDPOINT ?? "http://localhost:3001";
const SECRET = process.env.DEMO_AGENT_SECRET_KEY;
// Per-call network override. Omit to use the server's X402_NETWORK
// default. Pass e.g. NEXUS_NETWORK=mainnet to force a Solana mainnet
// settlement on an endpoint whose default is still devnet.
const NETWORK = process.env.NEXUS_NETWORK;
// Optional facilitator selector. NEXUS_VIA=cdp routes settlement
// through Coinbase's facilitator so the call lands in the x402
// Bazaar / Agentic.Market index.
const VIA = process.env.NEXUS_VIA;

async function main() {
  if (!SECRET) {
    console.error(
      "DEMO_AGENT_SECRET_KEY required — supply a base58 64-byte secret " +
        "for a USDC-funded agent."
    );
    process.exit(1);
  }

  // SOLANA_RPC_URL is auto-picked up by the constructor (via env) but
  // we pass it explicitly so the log line below reflects what's in use.
  const rpcUrl = process.env.SOLANA_RPC_URL?.trim() || undefined;
  const agent = X402Agent.fromBase58(SECRET, { rpcUrl });
  console.log(`Endpoint:     ${ENDPOINT}`);
  if (rpcUrl) console.log(`Solana RPC:   ${rpcUrl}`);
  console.log(`Agent pubkey: ${agent.pubkey}`);
  if (NETWORK) console.log(`Network:      ${NETWORK} (per-call override)`);
  if (VIA) console.log(`Facilitator:  via=${VIA}`);
  console.log();

  const messages = [
    { role: "user" as const, content: "Reply with exactly: hello from x402" },
  ];

  console.log("→ payAndInfer …");
  const t0 = Date.now();
  const res = await agent.payAndInfer(`${ENDPOINT}/api/v1`, {
    model: "openai/gpt-4o-mini",
    messages,
    ...(NETWORK ? { network: NETWORK } : {}),
    ...(VIA ? { via: VIA } : {}),
  });
  console.log(`  ✓ ${Date.now() - t0}ms`);
  console.log();

  if (!res.receipt) {
    console.error("No receipt in response");
    process.exit(1);
  }

  const network = res.receipt.payment.network;
  const cluster = network === "solana:devnet" ? "?cluster=devnet" : "";
  console.log("Receipt:");
  console.log(`  v:               ${res.receipt.v}`);
  console.log(`  inference_id:    ${res.receipt.inference_id}`);
  console.log(`  upstream/model:  ${res.receipt.upstream} / ${res.receipt.model}`);
  console.log(`  cost_usdc:       ${res.receipt.cost_usdc}`);
  console.log(`  payment.tx:      ${res.receipt.payment.tx_signature}`);
  console.log(
    `  explorer:        https://explorer.solana.com/tx/${res.receipt.payment.tx_signature}${cluster}`
  );
  console.log(`  payment.pay_to:  ${res.receipt.payment.pay_to ?? "(missing)"}`);
  console.log();

  console.log("OpenAI response:");
  const content = res.openai.choices?.[0]?.message?.content ?? "(empty)";
  console.log(`  ${content.slice(0, 200)}`);
  console.log();

  console.log("→ verifyReceipt …");
  const v = await verifyReceipt({
    receipt: res.receipt,
    prompt: messages,
    response: res.openai,
    endpoint: ENDPOINT,
    // api.devnet.solana.com indexes getTransaction >2min behind
    // confirmation. Pass SOLANA_RPC_URL to point at a fast RPC
    // (Helius / Triton / QuickNode) for sub-second verify.
    rpc: process.env.SOLANA_RPC_URL,
  });
  console.log(`  ok: ${v.ok}`);
  for (const [k, val] of Object.entries(v.checks)) {
    console.log(`    ${val ? "✓" : "✗"} ${k}`);
  }

  process.exit(v.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
