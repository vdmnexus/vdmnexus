/**
 * Mainnet smoke test for @solana-agent-kit/plugin-vdm-nexus.
 *
 * Drives each of the three plugin actions through their handler entry
 * points using a stubbed SolanaAgentKit that only exposes
 * `wallet.publicKey` — exactly the surface the plugin reads. Confirms
 * end-to-end behavior against the live mainnet rail.
 *
 * Required env:
 *   TEST_AGENT_PUBKEY   base58 pubkey for the mainnet-funded test wallet
 *   TEST_AGENT_SECRET   base58 64-byte secret for the same wallet
 *
 * Optional env:
 *   NEXUS_ENDPOINT      defaults to https://nexus.vdmnexus.com/api/v1
 */

import { PublicKey } from "@solana/web3.js";
import VdmNexusPlugin, { configure } from "../dist/index.js";

const PUB = process.env.TEST_AGENT_PUBKEY;
const SEC = process.env.TEST_AGENT_SECRET;
const ENDPOINT = process.env.NEXUS_ENDPOINT ?? "https://nexus.vdmnexus.com/api/v1";

if (!PUB || !SEC) {
  console.error("TEST_AGENT_PUBKEY and TEST_AGENT_SECRET are required");
  process.exit(1);
}

configure({ signerSecretKey: SEC });

const agentStub = { wallet: { publicKey: new PublicKey(PUB) } };

console.log(`Endpoint:  ${ENDPOINT}`);
console.log(`Wallet:    ${PUB}`);
console.log(`Plugin:    ${VdmNexusPlugin.name}`);
console.log(`Actions:   ${VdmNexusPlugin.actions.map((a) => a.name).join(", ")}`);
console.log();

VdmNexusPlugin.initialize(agentStub);

const [chatAction, verifyAction, depositAction] = VdmNexusPlugin.actions;

console.log("→ NEXUS_GET_DEPOSIT_ADDRESS …");
const t1 = Date.now();
const dep = await depositAction.handler(agentStub, { network: "solana:mainnet" });
console.log(`  ${Date.now() - t1}ms`);
console.log(`  status: ${dep.status}`);
console.log(`  address: ${dep.address}`);
console.log(`  mint:    ${dep.mint}`);
console.log(`  network: ${dep.network}`);
if (dep.status !== "success") {
  console.error("deposit address fetch failed");
  process.exit(1);
}
console.log();

const messages = [
  { role: "user", content: "Reply with exactly: hello from sendai plugin" },
];

console.log("→ NEXUS_CHAT …");
const t2 = Date.now();
const chat = await chatAction.handler(agentStub, {
  model: "openai/gpt-4o-mini",
  messages,
  network: "solana:mainnet",
});
console.log(`  ${Date.now() - t2}ms`);
console.log(`  status: ${chat.status}`);
if (chat.status !== "success") {
  console.error("NEXUS_CHAT failed:", chat);
  process.exit(1);
}
const receipt = chat.receipt;
const openai = chat.openai;
const cluster = receipt.payment.network === "solana:devnet" ? "?cluster=devnet" : "";
console.log(`  inference_id:    ${receipt.inference_id}`);
console.log(`  upstream/model:  ${receipt.upstream} / ${receipt.model}`);
console.log(`  cost_usdc:       ${receipt.cost_usdc}`);
console.log(`  payment.tx:      ${receipt.payment.tx_signature}`);
console.log(`  explorer:        https://explorer.solana.com/tx/${receipt.payment.tx_signature}${cluster}`);
const content = openai.choices?.[0]?.message?.content ?? "(empty)";
console.log(`  response:        ${content.slice(0, 120)}`);
console.log();

console.log("→ NEXUS_VERIFY_RECEIPT …");
const t3 = Date.now();
const v = await verifyAction.handler(agentStub, {
  receipt,
  prompt: messages,
  response: openai,
  endpoint: ENDPOINT.replace(/\/api\/v1$/, ""),
});
console.log(`  ${Date.now() - t3}ms`);
console.log(`  status: ${v.status}`);
console.log(`  ok:     ${v.ok}`);
for (const [k, val] of Object.entries(v.checks ?? {})) {
  console.log(`    ${val ? "✓" : "✗"} ${k}`);
}

process.exit(v.ok ? 0 : 1);
