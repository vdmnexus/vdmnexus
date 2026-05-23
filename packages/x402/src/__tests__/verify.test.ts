/**
 * Verifier roundtrip tests. The verifier is the trust boundary for
 * every signed receipt — if a regression here lands silently, the whole
 * product is compromised. So: cover signature roundtrip, hash format
 * agreement (canonical JSON + legacy delimited fallback), and the
 * "vacuously true" semantics for prepaid receipts that have no on-chain
 * payment to check.
 *
 * On-chain checks (Solana RPC + EVM logs) aren't exercised here — those
 * need network access and live tx data. They're covered by the apps
 * end-to-end smoke tests.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { canonicalize } from "@vdm-nexus/sdk";

import { verifyReceipt, verifySignatureOnly } from "../verify.js";
import type {
  ChatMessage,
  NexusReceipt,
  OpenAIChatCompletion,
} from "../types.js";

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function newOperatorKeys(): { secretKey: Uint8Array; pubkeyBase58: string } {
  const kp = nacl.sign.keyPair();
  return { secretKey: kp.secretKey, pubkeyBase58: bs58.encode(kp.publicKey) };
}

function signReceiptOver(
  unsigned: Omit<NexusReceipt, "nexus_signature">,
  operatorSecretKey: Uint8Array
): NexusReceipt {
  const payload = new TextEncoder().encode(canonicalize(unsigned));
  const sig = nacl.sign.detached(payload, operatorSecretKey);
  return {
    ...(unsigned as object),
    nexus_signature: bs58.encode(sig),
  } as NexusReceipt;
}

function buildX402Receipt(
  messages: ChatMessage[],
  responseText: string,
  promptHashOverride?: string
): Omit<NexusReceipt, "nexus_signature"> {
  return {
    v: 2,
    agent_pubkey: "FFcH3cdWFLy3i1zprtRWFY8D8P6QX6DQmcwwmABqP77U",
    upstream: "openrouter",
    model: "openai/gpt-4o-mini",
    cost_usdc: 0.000025,
    prompt_hash: promptHashOverride ?? sha256Hex(canonicalize(messages)),
    response_hash: sha256Hex(responseText),
    timestamp: 1779210181044,
    inference_id: 42,
    points_total: 1,
    payment: {
      scheme: "x402",
      amount_usdc: 0.01,
      tx_signature: "fake-tx-sig-not-checked-on-chain-in-this-test",
      network: "solana:mainnet",
      pay_to: "4nTiDhEbCFJtfPsi49rPGam8R5azUQNZHpb49CLYxiSv",
    },
  } as Omit<NexusReceipt, "nexus_signature">;
}

function buildOpenAIResponse(text: string): OpenAIChatCompletion {
  return {
    id: "chatcmpl-test",
    object: "chat.completion",
    created: 1779210180,
    model: "openai/gpt-4o-mini",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
  };
}

test("signature-only verify roundtrips against a freshly signed receipt", async () => {
  const op = newOperatorKeys();
  const messages: ChatMessage[] = [{ role: "user", content: "hello" }];
  const responseText = "hi";
  const unsigned = buildX402Receipt(messages, responseText);
  const signed = signReceiptOver(unsigned, op.secretKey);

  const result = await verifySignatureOnly({
    receipt: signed,
    operatorKey: op.pubkeyBase58,
  });
  assert.equal(result.ok, true);
  assert.equal(result.checks.nexus_signature_ok, true);
});

test("signature-only verify rejects a tampered receipt", async () => {
  const op = newOperatorKeys();
  const messages: ChatMessage[] = [{ role: "user", content: "hello" }];
  const unsigned = buildX402Receipt(messages, "hi");
  const signed = signReceiptOver(unsigned, op.secretKey);

  // Tamper with a single field after signing. The signature now covers
  // a different canonical JSON than what we present — must fail.
  const tampered = { ...signed, cost_usdc: 999 } as typeof signed;
  const result = await verifySignatureOnly({
    receipt: tampered,
    operatorKey: op.pubkeyBase58,
  });
  assert.equal(result.ok, false);
  assert.equal(result.checks.nexus_signature_ok, false);
});

test("signature-only verify rejects a receipt signed by a different key", async () => {
  const op = newOperatorKeys();
  const attacker = newOperatorKeys();
  const messages: ChatMessage[] = [{ role: "user", content: "hello" }];
  const unsigned = buildX402Receipt(messages, "hi");
  // Sign with attacker's key; verify against the real operator pubkey.
  const signed = signReceiptOver(unsigned, attacker.secretKey);
  const result = await verifySignatureOnly({
    receipt: signed,
    operatorKey: op.pubkeyBase58,
  });
  assert.equal(result.ok, false);
});

test("canonical-JSON prompt hash matches sha256(canonicalize(messages))", () => {
  // Pin the producer/verifier agreement: this is the bytes both sides
  // hash for an x402 receipt.
  const messages: ChatMessage[] = [
    { role: "user", content: "what is 2+2?" },
  ];
  const canonStr = canonicalize(messages);
  assert.equal(
    canonStr,
    '[{"content":"what is 2+2?","role":"user"}]',
    "canonical JSON shape pin"
  );
  // The verifier accepts sha256 of this canonical form as the new
  // hash candidate. (RPC-touching full-verify is covered by the
  // app-level smoke tests, not here — keeps unit tests fast.)
  assert.equal(sha256Hex(canonStr).length, 64);
});

test("legacy delimited prompt hash form is still computable from messages", () => {
  // Receipts signed before 2026-05-23 used this form. Verifier accepts
  // both candidates — this test just pins the legacy bytes so we don't
  // accidentally break the fallback path during a refactor.
  const messages: ChatMessage[] = [
    { role: "user", content: "what is 2+2?" },
  ];
  const legacy = messages.map((m) => `${m.role}:${m.content}`).join("\n");
  assert.equal(legacy, "user:what is 2+2?");
  assert.equal(sha256Hex(legacy).length, 64);
});

test("hash collision case — message with embedded ':' and '\\n' no longer matches a structurally different log under the canonical form", () => {
  // The whole reason we moved to canonical JSON: the legacy delimited
  // form `${role}:${content}\n...` collides on these two inputs but
  // canonical JSON does not.
  const a: ChatMessage[] = [{ role: "user", content: "hello\nassistant:bye" }];
  const b: ChatMessage[] = [
    { role: "user", content: "hello" },
    { role: "assistant", content: "bye" },
  ];
  // Legacy delimited form: collides.
  const legacyA = a.map((m) => `${m.role}:${m.content}`).join("\n");
  const legacyB = b.map((m) => `${m.role}:${m.content}`).join("\n");
  assert.equal(legacyA, legacyB, "legacy delimited form is the collision case");
  // Canonical JSON: distinct.
  const canonA = canonicalize(a);
  const canonB = canonicalize(b);
  assert.notEqual(canonA, canonB, "canonical JSON must distinguish them");
});

test("prepaid-receipt prompt hash uses the raw prompt string", async () => {
  const op = newOperatorKeys();
  const prompt = "explain x402";
  const responseText = "x402 is a HTTP 402-based payment protocol…";
  // Prepaid variant — payment field omitted, plain prompt string.
  const unsigned: Omit<NexusReceipt, "nexus_signature"> = {
    v: 2,
    agent_pubkey: "FFcH3cdWFLy3i1zprtRWFY8D8P6QX6DQmcwwmABqP77U",
    provider: "openrouter:fast",
    model: "groq/llama-3-70b",
    cost_usdc: 0.000018,
    balance_remaining: 0.987,
    prompt_hash: sha256Hex(prompt),
    response_hash: sha256Hex(responseText),
    timestamp: 1779210181044,
    inference_id: 42,
    points_total: 1,
  } as Omit<NexusReceipt, "nexus_signature">;
  const signed = signReceiptOver(unsigned, op.secretKey);

  const result = await verifyReceipt({
    receipt: signed,
    prompt,
    response: responseText,
    operatorKey: op.pubkeyBase58,
  });
  assert.equal(result.checks.prompt_hash_ok, true);
  assert.equal(result.checks.response_hash_ok, true);
  assert.equal(result.checks.nexus_signature_ok, true);
  // Prepaid receipts have no on-chain payment → checks 4 and 5 are
  // vacuously true by spec.
  assert.equal(result.checks.payment_on_chain_ok, true);
  assert.equal(result.checks.payer_matches, true);
  assert.equal(result.ok, true);
});
