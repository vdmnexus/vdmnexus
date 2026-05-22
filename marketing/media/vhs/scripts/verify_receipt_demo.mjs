// Self-contained demo of `verifyReceipt` from `@vdm-nexus/x402`.
//
// Builds a SIR v2 receipt against a generated operator keypair, signs
// it with the canonicalization rules the spec mandates (sorted keys,
// no whitespace, `nexus_signature` excluded), then verifies it. The
// receipt has no `payment` field — it models a prepaid `/v1/inference`
// receipt — so the two on-chain checks come back vacuously true. The
// three cryptographic checks (`prompt_hash`, `response_hash`,
// `nexus_signature`) are the real exercise of the verifier code path.
//
// Used by `verify-receipt.tape`. Setup:
//   cd marketing/media/vhs/scripts && npm install
//   node verify_receipt_demo.mjs

import { createHash } from "node:crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";

import { verifyReceipt } from "@vdm-nexus/x402";

const PROMPT = "What is signed inference, in one sentence?";
const RESPONSE =
  "It is an LLM call paired with an on-chain payment and a cryptographic " +
  "receipt the caller can verify independently.";

const sha256 = (s) =>
  createHash("sha256").update(s, "utf-8").digest("hex");

const canonicalize = (v) => {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalize).join(",") + "]";
  const keys = Object.keys(v).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalize(v[k]))
      .join(",") +
    "}"
  );
};

const operator = nacl.sign.keyPair();
const operatorPub = bs58.encode(operator.publicKey);

const agent = nacl.sign.keyPair();
const agentPub = bs58.encode(agent.publicKey);

const unsigned = {
  v: 2,
  agent_pubkey: agentPub,
  provider: "openrouter",
  model: "openai/gpt-4o-mini",
  cost_usdc: 0.00042,
  balance_remaining: 0.4271,
  prompt_hash: sha256(PROMPT),
  response_hash: sha256(RESPONSE),
  timestamp: Date.now(),
  inference_id: "demo-inf-9b41",
};

const sig = nacl.sign.detached(
  new TextEncoder().encode(canonicalize(unsigned)),
  operator.secretKey
);
const receipt = { ...unsigned, nexus_signature: bs58.encode(sig) };

console.log("--- SIR v2 receipt ---");
console.log(JSON.stringify(receipt, null, 2));
console.log();

console.log("operator pubkey:", operatorPub);
console.log("agent pubkey:   ", agentPub);
console.log();

console.log("running verifyReceipt...");
const result = await verifyReceipt({
  receipt,
  prompt: PROMPT,
  response: RESPONSE,
  operatorKey: operatorPub,
});

console.log();
console.log("--- 5-check result ---");
for (const [name, ok] of Object.entries(result.checks)) {
  console.log(`  ${ok ? "[OK]" : "[FAIL]"}  ${name}`);
}
console.log();
console.log(result.ok ? "RECEIPT VERIFIED" : "RECEIPT FAILED VERIFICATION");
