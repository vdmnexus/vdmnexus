/**
 * Canonicalize correctness tests. This function is the single point of
 * agreement between every signer + verifier in the Nexus ecosystem —
 * `@vdm-nexus/paywall` (signs receipts), `@vdm-nexus/x402` (verifies
 * receipts), `apps/nexus` (signs server-side). If canonicalize drifts,
 * every signature in the wild silently breaks. So: pin the bytes here.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalize } from "../canonicalize.js";

test("primitives serialize via JSON.stringify", () => {
  assert.equal(canonicalize(null), "null");
  assert.equal(canonicalize(true), "true");
  assert.equal(canonicalize(false), "false");
  assert.equal(canonicalize(42), "42");
  assert.equal(canonicalize(3.14), "3.14");
  assert.equal(canonicalize("hello"), '"hello"');
  assert.equal(canonicalize(""), '""');
});

test("strings escape correctly via JSON.stringify", () => {
  assert.equal(canonicalize('a"b'), '"a\\"b"');
  assert.equal(canonicalize("a\nb"), '"a\\nb"');
  assert.equal(canonicalize("a\\b"), '"a\\\\b"');
  assert.equal(canonicalize("emoji 🚀"), '"emoji 🚀"');
});

test("arrays preserve order", () => {
  assert.equal(canonicalize([1, 2, 3]), "[1,2,3]");
  assert.equal(canonicalize([3, 1, 2]), "[3,1,2]");
  assert.equal(canonicalize([]), "[]");
});

test("object keys sort lexicographically", () => {
  assert.equal(canonicalize({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(canonicalize({ z: 1, a: 1, m: 1 }), '{"a":1,"m":1,"z":1}');
});

test("sort is UTF-16 code-unit order (matches Array.prototype.sort on strings)", () => {
  // Uppercase < lowercase under UTF-16 code-unit comparison.
  assert.equal(canonicalize({ a: 1, B: 2 }), '{"B":2,"a":1}');
  // Numeric chars are lower than alpha chars.
  assert.equal(canonicalize({ a: 1, "1": 2 }), '{"1":2,"a":1}');
});

test("nested objects canonicalize recursively", () => {
  const input = { b: { y: 1, x: 2 }, a: { d: 3, c: 4 } };
  const expected = '{"a":{"c":4,"d":3},"b":{"x":2,"y":1}}';
  assert.equal(canonicalize(input), expected);
});

test("nested arrays of objects canonicalize correctly", () => {
  const input = [{ b: 1, a: 2 }, { d: 3, c: 4 }];
  const expected = '[{"a":2,"b":1},{"c":4,"d":3}]';
  assert.equal(canonicalize(input), expected);
});

test("no whitespace anywhere", () => {
  const s = canonicalize({ a: [1, 2], b: { c: "d" } });
  assert.equal(/\s/.test(s), false, "canonical form must contain no whitespace");
});

test("null inside an object is serialized", () => {
  assert.equal(canonicalize({ a: null }), '{"a":null}');
});

test("empty object", () => {
  assert.equal(canonicalize({}), "{}");
});

test("receipt-shaped input — sanity test against the real SIR v2 fields", () => {
  // A subset of the SIR v2 receipt shape, intentionally with unsorted
  // keys. The output should be stable byte-for-byte across runs.
  const receipt = {
    v: 2,
    timestamp: 1779210181044,
    agent_pubkey: "FFcH3cdWFLy3i1zprtRWFY8D8P6QX6DQmcwwmABqP77U",
    cost_usdc: 0.000025,
    model: "openai/gpt-4o-mini",
    prompt_hash: "64914968651ba207c2dee425f15d8cacc671647227106ea149e06a959db40b52",
    response_hash:
      "9861ad24639cea52d146ff3b64e003084ceeba5c2d3348791bfa6a9b753afb91",
    inference_id: "98dc7bb0-24a0-41f3-872c-9b4c4786c280",
    payment: {
      pay_to: "4nTiDhEbCFJtfPsi49rPGam8R5azUQNZHpb49CLYxiSv",
      network: "solana:mainnet",
      amount_usdc: 0.01,
      scheme: "exact",
    },
  };
  const out = canonicalize(receipt);
  // The order is deterministic and lexicographic; this is the exact
  // string a signer hashes / verifies against.
  const expected =
    '{"agent_pubkey":"FFcH3cdWFLy3i1zprtRWFY8D8P6QX6DQmcwwmABqP77U",' +
    '"cost_usdc":0.000025,' +
    '"inference_id":"98dc7bb0-24a0-41f3-872c-9b4c4786c280",' +
    '"model":"openai/gpt-4o-mini",' +
    '"payment":{"amount_usdc":0.01,"network":"solana:mainnet","pay_to":"4nTiDhEbCFJtfPsi49rPGam8R5azUQNZHpb49CLYxiSv","scheme":"exact"},' +
    '"prompt_hash":"64914968651ba207c2dee425f15d8cacc671647227106ea149e06a959db40b52",' +
    '"response_hash":"9861ad24639cea52d146ff3b64e003084ceeba5c2d3348791bfa6a9b753afb91",' +
    '"timestamp":1779210181044,' +
    '"v":2}';
  assert.equal(out, expected);
});
