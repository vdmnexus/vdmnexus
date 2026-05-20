#!/usr/bin/env node
/**
 * Generates the canonical test vectors for the Signed Inference Receipt
 * (SIR) v2 specification.
 *
 * Runs as a one-shot:
 *   node generate.mjs
 *
 * Writes files into the three vector directories adjacent to this script.
 * Idempotent: re-running with the same vector-operator key produces
 * byte-identical vectors. The script writes a fresh `operator-keypair.json`
 * (private + public) the first time it runs, then re-uses it on subsequent
 * runs so receipts stay verifiable against the same operator pubkey.
 *
 * Dependencies: tweetnacl, bs58 (already in the workspace via
 * @vdm-nexus/sdk).
 */

import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve tweetnacl + bs58 from the workspace x402 package which already
// has them as runtime deps. Implementers regenerating vectors outside this
// monorepo should `npm i tweetnacl bs58` in any directory and update this
// path.
const x402Pkg = resolve(__dirname, "../../../../../packages/x402/package.json");
const require = createRequire(x402Pkg);
const nacl = require("tweetnacl");
const bs58Module = require("bs58");
const bs58 = bs58Module.default ?? bs58Module;

function sha256Hex(s) {
  return createHash("sha256").update(s).digest("hex");
}

/**
 * Canonical JSON: sorted keys recursively, no whitespace, primitives via
 * JSON.stringify. Mirrors `apps/nexus/lib/receipts.ts`.
 */
function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalize(value[k]))
      .join(",") +
    "}"
  );
}

function signReceipt(receipt, operatorSecretKey) {
  const payload = new TextEncoder().encode(canonicalize(receipt));
  const sig = nacl.sign.detached(payload, operatorSecretKey);
  return { ...receipt, nexus_signature: bs58.encode(sig) };
}

// ─── operator key (stable across runs) ────────────────────────────────────

const operatorKeyPath = join(__dirname, "operator-keypair.json");

let operatorPubkey;
let operatorSecretKey;
if (existsSync(operatorKeyPath)) {
  const stored = JSON.parse(readFileSync(operatorKeyPath, "utf8"));
  operatorSecretKey = bs58.decode(stored.secret_key_base58);
  operatorPubkey = stored.pubkey_base58;
  console.log("Loaded existing vector operator keypair.");
} else {
  const kp = nacl.sign.keyPair();
  operatorSecretKey = kp.secretKey;
  operatorPubkey = bs58.encode(kp.publicKey);
  writeFileSync(
    operatorKeyPath,
    JSON.stringify(
      {
        note: "Operator keypair used to sign the SIR v2 test vectors. NOT a production credential — only used to produce reproducible test vectors. This file is gitignored; it stays on the machine that generated the committed receipts.",
        pubkey_base58: operatorPubkey,
        secret_key_base58: bs58.encode(operatorSecretKey),
      },
      null,
      2
    ) + "\n"
  );
  console.log("Generated fresh vector operator keypair.");
}

// ─── stable test agent keypair ────────────────────────────────────────────
// Fixed seed so prepaid receipts hash-stably. Not a security claim — these
// are test vectors and the seed is published.

const TEST_AGENT_SEED_HEX =
  "0101010101010101010101010101010101010101010101010101010101010101";
const agentSeed = Buffer.from(TEST_AGENT_SEED_HEX, "hex");
const agentKp = nacl.sign.keyPair.fromSeed(agentSeed);
const agentPubkey = bs58.encode(agentKp.publicKey);

console.log("Test agent pubkey:", agentPubkey);
console.log("Operator pubkey:   ", operatorPubkey);

// ─── vector 1: prepaid-001 (happy-path /v1/inference) ─────────────────────

const prepaidRequest = {
  prompt: "What is the capital of France?",
  task_type: "fast",
  nonce: "vector-prepaid-001",
  timestamp: 1700000000000,
};
const prepaidResponse = "The capital of France is Paris.";

const prepaidReceipt = signReceipt(
  {
    v: 2,
    agent_pubkey: agentPubkey,
    provider: "openrouter:fast",
    model: "llama-3-70b",
    cost_usdc: 0.000123,
    balance_remaining: 0.999877,
    prompt_hash: sha256Hex(prepaidRequest.prompt),
    response_hash: sha256Hex(prepaidResponse),
    timestamp: 1700000000123,
    inference_id: 42,
    points_total: 1,
  },
  operatorSecretKey
);

const prepaidExpected = {
  prompt_hash_expected: sha256Hex(prepaidRequest.prompt),
  response_hash_expected: sha256Hex(prepaidResponse),
  canonical_payload_hex: Buffer.from(
    canonicalize(
      Object.fromEntries(
        Object.entries(prepaidReceipt).filter(
          ([k]) => k !== "nexus_signature"
        )
      )
    ),
    "utf8"
  ).toString("hex"),
  checks: {
    prompt_hash_ok: true,
    response_hash_ok: true,
    nexus_signature_ok: true,
    payment_on_chain_ok: true,
    payer_matches: true,
  },
  ok: true,
  notes:
    "Happy-path prepaid receipt. Checks 4 & 5 are vacuously true (no payment field).",
};

writeFileSync(
  join(__dirname, "prepaid-001", "request.json"),
  JSON.stringify(prepaidRequest, null, 2) + "\n"
);
writeFileSync(
  join(__dirname, "prepaid-001", "response.json"),
  JSON.stringify({ result: prepaidResponse }, null, 2) + "\n"
);
writeFileSync(
  join(__dirname, "prepaid-001", "receipt.json"),
  JSON.stringify(prepaidReceipt, null, 2) + "\n"
);
writeFileSync(
  join(__dirname, "prepaid-001", "operator-pubkey.txt"),
  operatorPubkey + "\n"
);
writeFileSync(
  join(__dirname, "prepaid-001", "expected.json"),
  JSON.stringify(prepaidExpected, null, 2) + "\n"
);

// ─── vector 2: x402-001 (happy-path /v1/chat/completions) ─────────────────

const x402Request = {
  model: "openai/gpt-4o-mini",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Say hi in one word." },
  ],
};

const x402Response = {
  id: "chatcmpl-vector-x402-001",
  object: "chat.completion",
  created: 1700000010,
  model: "openai/gpt-4o-mini",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "Hello!" },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 18, completion_tokens: 2, total_tokens: 20 },
};

const x402PromptForHash = x402Request.messages
  .map((m) => `${m.role}:${m.content}`)
  .join("\n");
const x402ResponseText = x402Response.choices[0].message.content;

const x402Receipt = signReceipt(
  {
    v: 2,
    agent_pubkey: agentPubkey,
    upstream: "openrouter",
    model: "openai/gpt-4o-mini",
    cost_usdc: 0.000045,
    prompt_hash: sha256Hex(x402PromptForHash),
    response_hash: sha256Hex(x402ResponseText),
    timestamp: 1700000010234,
    inference_id: 1337,
    points_total: 2,
    payment: {
      scheme: "x402",
      amount_usdc: 0.01,
      tx_signature:
        "5gMvA8YJrkbtBoRZHPwYAyqVqEYPFPq8e7DEFGsB7Wr5jKLNm2pQ9ZYDVTHbV3uXk1nWnpkbX7vRz9aGqFvw8sZP",
      network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1aFoKMcMZ9YTs",
      pay_to: "8wFSAv3VrwYP7Vh9pTU8DcRSPp31wH2X3VqJXm4Hk1Lb",
    },
  },
  operatorSecretKey
);

const x402Expected = {
  prompt_hash_expected: sha256Hex(x402PromptForHash),
  response_hash_expected: sha256Hex(x402ResponseText),
  canonical_payload_hex: Buffer.from(
    canonicalize(
      Object.fromEntries(
        Object.entries(x402Receipt).filter(([k]) => k !== "nexus_signature")
      )
    ),
    "utf8"
  ).toString("hex"),
  checks: {
    prompt_hash_ok: true,
    response_hash_ok: true,
    nexus_signature_ok: true,
    payment_on_chain_ok: "skip-offline",
    payer_matches: "skip-offline",
  },
  ok: "offline-undetermined",
  notes:
    "Happy-path x402 receipt. tx_signature is SYNTHETIC and will NOT resolve on Solana devnet — conformant verifiers running in offline mode MUST report payment_on_chain_ok=false (vacuously), payer_matches=false (vacuously). A separate production-data vector covers the on-chain checks.",
};

writeFileSync(
  join(__dirname, "x402-001", "request.json"),
  JSON.stringify(x402Request, null, 2) + "\n"
);
writeFileSync(
  join(__dirname, "x402-001", "response.json"),
  JSON.stringify(x402Response, null, 2) + "\n"
);
writeFileSync(
  join(__dirname, "x402-001", "receipt.json"),
  JSON.stringify(x402Receipt, null, 2) + "\n"
);
writeFileSync(
  join(__dirname, "x402-001", "operator-pubkey.txt"),
  operatorPubkey + "\n"
);
writeFileSync(
  join(__dirname, "x402-001", "expected.json"),
  JSON.stringify(x402Expected, null, 2) + "\n"
);

// ─── vector 3: negative-001 (tampered response_hash) ──────────────────────

const tamperedReceipt = JSON.parse(JSON.stringify(x402Receipt));
// Flip the last char of response_hash. Signature still covers the OLD hash,
// so signature verification still passes, but response_hash_ok fails.
const oldChar = tamperedReceipt.response_hash.slice(-1);
const newChar = oldChar === "0" ? "1" : "0";
tamperedReceipt.response_hash =
  tamperedReceipt.response_hash.slice(0, -1) + newChar;

const negativeExpected = {
  prompt_hash_expected: sha256Hex(x402PromptForHash),
  response_hash_expected: sha256Hex(x402ResponseText),
  canonical_payload_hex: Buffer.from(
    canonicalize(
      Object.fromEntries(
        Object.entries(tamperedReceipt).filter(
          ([k]) => k !== "nexus_signature"
        )
      )
    ),
    "utf8"
  ).toString("hex"),
  checks: {
    prompt_hash_ok: true,
    response_hash_ok: false,
    nexus_signature_ok: false,
    payment_on_chain_ok: "skip-offline",
    payer_matches: "skip-offline",
  },
  ok: false,
  notes:
    "Tampered x402 receipt: the last char of response_hash was flipped after signing. Conformant verifiers MUST reject. Both response_hash_ok and nexus_signature_ok fail (the signature was over the original hash, so altering the field also invalidates the signature against the new canonical payload).",
};

writeFileSync(
  join(__dirname, "negative-001", "request.json"),
  JSON.stringify(x402Request, null, 2) + "\n"
);
writeFileSync(
  join(__dirname, "negative-001", "response.json"),
  JSON.stringify(x402Response, null, 2) + "\n"
);
writeFileSync(
  join(__dirname, "negative-001", "receipt.json"),
  JSON.stringify(tamperedReceipt, null, 2) + "\n"
);
writeFileSync(
  join(__dirname, "negative-001", "operator-pubkey.txt"),
  operatorPubkey + "\n"
);
writeFileSync(
  join(__dirname, "negative-001", "expected.json"),
  JSON.stringify(negativeExpected, null, 2) + "\n"
);

console.log("\nGenerated 3 vectors. Operator pubkey:", operatorPubkey);
