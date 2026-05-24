/**
 * Base Sepolia smoke test for the SendAI plugin's EVM path.
 *
 * Drives NEXUS_CHAT with network: "eip155:84532" through a stubbed
 * SolanaAgentKit. Validates:
 *   - The plugin skips the wallet_signer_mismatch guard for EVM
 *   - X402Agent registers the EVM scheme when evmPrivateKey is set
 *   - The Base Sepolia x402 facilitator on nexus.vdmnexus.com responds
 *   - ERC-3009 transferWithAuthorization is signed + settled on chain
 *   - Receipt verification passes (prompt+response hashes,
 *     nexus_signature, payment_on_chain, payer_matches)
 *
 * Required env:
 *   TEST_AGENT_PUBKEY   base58 Solana pubkey (only used to stub the
 *                       SendAI wallet — never used to pay)
 *   TEST_EVM_PRIVATE_KEY  0x-prefixed hex secp256k1 secret, funded
 *                         with Base Sepolia USDC + ETH
 */

import { PublicKey } from "@solana/web3.js";
import VdmNexusPlugin, { configure } from "../dist/index.js";

const SOL_PUB = process.env.TEST_AGENT_PUBKEY;
const EVM_KEY = process.env.TEST_EVM_PRIVATE_KEY;
const ENDPOINT = process.env.NEXUS_ENDPOINT ?? "https://nexus.vdmnexus.com/api/v1";

if (!SOL_PUB || !EVM_KEY) {
  console.error("TEST_AGENT_PUBKEY and TEST_EVM_PRIVATE_KEY are required");
  process.exit(1);
}

configure({ evmPrivateKey: EVM_KEY });

const agentStub = { wallet: { publicKey: new PublicKey(SOL_PUB) } };

console.log(`Endpoint:   ${ENDPOINT}`);
console.log(`SendAI Sol: ${SOL_PUB} (stub; not the payer)`);
console.log(`Plugin:     ${VdmNexusPlugin.name}`);
console.log();

VdmNexusPlugin.initialize(agentStub);
const [chatAction, verifyAction] = VdmNexusPlugin.actions;

const messages = [
  { role: "user", content: "Reply with exactly: hello from base sepolia" },
];

console.log("→ NEXUS_CHAT (network=eip155:84532) …");
const t0 = Date.now();
const chat = await chatAction.handler(agentStub, {
  model: "openai/gpt-4o-mini",
  messages,
  network: "eip155:84532",
});
console.log(`  ${Date.now() - t0}ms`);
console.log(`  status:    ${chat.status}`);
if (chat.status !== "success") {
  console.error("NEXUS_CHAT failed:", JSON.stringify(chat, null, 2));
  process.exit(1);
}
console.log(`  evm_payer: ${chat.evm_payer}`);

const receipt = chat.receipt;
const openai = chat.openai;
console.log(`  inference_id:    ${receipt.inference_id}`);
console.log(`  upstream/model:  ${receipt.upstream} / ${receipt.model}`);
console.log(`  cost_usdc:       ${receipt.cost_usdc}`);
console.log(`  payment.network: ${receipt.payment.network}`);
console.log(`  payment.tx:      ${receipt.payment.tx_signature}`);
console.log(`  explorer:        https://sepolia.basescan.org/tx/${receipt.payment.tx_signature}`);
const content = openai.choices?.[0]?.message?.content ?? "(empty)";
console.log(`  response:        ${content.slice(0, 120)}`);
console.log();

console.log("→ NEXUS_VERIFY_RECEIPT …");
const t1 = Date.now();
const v = await verifyAction.handler(agentStub, {
  receipt,
  prompt: messages,
  response: openai,
  endpoint: ENDPOINT.replace(/\/api\/v1$/, ""),
});
console.log(`  ${Date.now() - t1}ms`);
console.log(`  status: ${v.status}`);
console.log(`  ok:     ${v.ok}`);
for (const [k, val] of Object.entries(v.checks ?? {})) {
  console.log(`    ${val ? "✓" : "✗"} ${k}`);
}

process.exit(v.ok ? 0 : 1);
