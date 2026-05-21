/**
 * Smoke tests for the paywall lifecycle. Uses `node:test` (zero new deps)
 * and the in-process MockFacilitator, so these run anywhere with Node 20+.
 *
 * The on-chain verification path is *not* exercised here — MockFacilitator
 * emits a synthetic tx signature that won't resolve via Solana RPC. The
 * apps/nexus integration tests cover that side. Here we prove:
 *
 *   1. Probe (no X-Payment) yields a well-formed 402 + challenge.
 *   2. A signed payment header runs onPaid and yields a 200 + receipt.
 *   3. The emitted receipt's Ed25519 signature verifies against the
 *      operator pubkey, end-to-end — same canonicalization as Nexus.
 *   4. Loop detection, allowlist, malformed payload, and the
 *      maxCostUsdc cap all fail-closed as documented.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import nacl from "tweetnacl";
import bs58 from "bs58";

import { createPaywall } from "../paywall.js";
import { canonicalize } from "../receipts.js";
import { encodeHeader, decodeHeader, X402_PAYMENT_HEADER, NEXUS_RECEIPT_HEADER } from "../headers.js";
import type { PaywallConfig } from "../types.js";

function newOperatorKey(): { secretKeyBase58: string; pubkeyBase58: string } {
  const kp = nacl.sign.keyPair();
  return {
    secretKeyBase58: bs58.encode(kp.secretKey),
    pubkeyBase58: bs58.encode(kp.publicKey),
  };
}

function newAgentKey(): string {
  const kp = nacl.sign.keyPair();
  return bs58.encode(kp.publicKey);
}

function silentLogger() {
  return { info: () => {}, warn: () => {}, error: () => {} };
}

function baseConfig(extra: Partial<PaywallConfig> = {}): PaywallConfig {
  const { secretKeyBase58 } = newOperatorKey();
  return {
    amount: 0.01,
    recipient: "GqYU2X4tQMjFmHnxYbN3VFx5tQv2eYZBXqRvWcF4Aaaa",
    network: "solana-devnet",
    operatorSecretKey: secretKeyBase58,
    facilitator: { mode: "mock" },
    onPaid: async () => ({
      response: { reply: "pong" },
      promptForHash: "ping",
      responseForHash: "pong",
      model: "test-model/v1",
    }),
    logger: silentLogger(),
    ...extra,
  };
}

function paymentHeaderFor(payer: string): string {
  return encodeHeader({
    x402Version: 2,
    scheme: "exact",
    network: "solana:devnet",
    payload: {
      payer,
      transaction: "base64-fake-tx",
    },
  });
}

test("probe with no X-Payment header returns 402 + base64 challenge", async () => {
  const { execute } = createPaywall(baseConfig());
  const result = await execute({
    method: "POST",
    url: "/api/agent",
    headers: { "content-type": "application/json" },
    body: { prompt: "ping" },
  });
  assert.equal(result.kind, "challenge");
  assert.equal(result.status, 402);
  const challengeHeader = result.headers["x-payment-required"];
  assert.ok(challengeHeader, "x-payment-required header missing");
  const decoded = decodeHeader<{ x402Version: number; accepts: Array<{ amount: string }> }>(
    challengeHeader
  );
  assert.equal(decoded?.x402Version, 2);
  assert.equal(decoded?.accepts[0]?.amount, "10000"); // 0.01 USDC in atomic
});

test("paid request runs onPaid and emits a signed receipt header", async () => {
  const op = newOperatorKey();
  const agent = newAgentKey();
  const { execute } = createPaywall(
    baseConfig({ operatorSecretKey: op.secretKeyBase58 })
  );
  const result = await execute({
    method: "POST",
    url: "/api/agent",
    headers: {
      "content-type": "application/json",
      [X402_PAYMENT_HEADER]: paymentHeaderFor(agent),
    },
    body: { prompt: "ping" },
  });
  assert.equal(result.kind, "paid");
  assert.equal(result.status, 200);
  const receiptHeader = result.headers[NEXUS_RECEIPT_HEADER];
  assert.ok(receiptHeader, "x-nexus-receipt header missing");
  const receipt = decodeHeader<Record<string, unknown> & {
    v: number;
    agent_pubkey: string;
    nexus_signature: string;
    payment: { tx_signature: string; pay_to: string; amount_usdc: number };
  }>(receiptHeader);
  assert.ok(receipt);
  assert.equal(receipt.v, 2);
  assert.equal(receipt.agent_pubkey, agent);
  assert.equal(receipt.payment.amount_usdc, 0.01);
  assert.ok(receipt.payment.tx_signature.startsWith("MOCK_"));

  // Round-trip: verify the Ed25519 signature against the canonicalized
  // receipt minus the signature itself — same rule as `verifyReceipt` in
  // `@vdm-nexus/x402`. Proves receipts from this paywall verify externally.
  const { nexus_signature, ...rest } = receipt;
  const payload = new TextEncoder().encode(canonicalize(rest));
  const ok = nacl.sign.detached.verify(
    payload,
    bs58.decode(nexus_signature),
    bs58.decode(op.pubkeyBase58)
  );
  assert.equal(ok, true, "operator signature failed to verify");
});

test("loopDetection short-circuits with 429 before settlement", async () => {
  let settled = false;
  const { execute } = createPaywall(
    baseConfig({
      loopDetection: () => true,
      onPaid: async () => {
        settled = true;
        return {
          response: {},
          promptForHash: "",
          responseForHash: "",
          model: "x",
        };
      },
    })
  );
  const result = await execute({
    method: "POST",
    url: "/api/agent",
    headers: {
      "content-type": "application/json",
      [X402_PAYMENT_HEADER]: paymentHeaderFor(newAgentKey()),
    },
    body: {},
  });
  assert.equal(result.kind, "error");
  assert.equal(result.status, 429);
  assert.equal(settled, false, "onPaid must not run when loop detected");
});

test("allowedPayers blocks unlisted payers with 403", async () => {
  const allowed = newAgentKey();
  const blocked = newAgentKey();
  const { execute } = createPaywall(
    baseConfig({ allowedPayers: new Set([allowed]) })
  );
  const result = await execute({
    method: "POST",
    url: "/api/agent",
    headers: {
      "content-type": "application/json",
      [X402_PAYMENT_HEADER]: paymentHeaderFor(blocked),
    },
    body: {},
  });
  assert.equal(result.kind, "error");
  assert.equal(result.status, 403);
  assert.equal((result.body as { error: string }).error, "agent_not_allowed");
});

test("malformed X-Payment header → 402 payment_malformed", async () => {
  const { execute } = createPaywall(baseConfig());
  const result = await execute({
    method: "POST",
    url: "/api/agent",
    headers: {
      "content-type": "application/json",
      [X402_PAYMENT_HEADER]: "!!!not-base64!!!",
    },
    body: {},
  });
  // Some non-base64 strings still decode to *something* — we accept either
  // payment_malformed (decode failed) or payment_missing_payer (decoded
  // but no payer field). Both are correct fail-closed outcomes.
  assert.equal(result.kind, "error");
  assert.equal(result.status, 402);
  const error = (result.body as { error: string }).error;
  assert.ok(
    error === "payment_malformed" || error === "payment_missing_payer",
    `unexpected error: ${error}`
  );
});

test("amount > maxCostUsdc throws synchronously at construction", () => {
  assert.throws(
    () => createPaywall(baseConfig({ amount: 1, maxCostUsdc: 0.05 })),
    /exceeds maxCostUsdc/
  );
});

test("tokenDiscountBps reduces the challenge amount on probe", async () => {
  const { execute } = createPaywall(
    baseConfig({
      amount: 0.10,
      tokenDiscountBps: () => 2000, // 20% off
    })
  );
  const result = await execute({
    method: "POST",
    url: "/api/agent",
    headers: {},
    body: {},
  });
  assert.equal(result.kind, "challenge");
  const decoded = decodeHeader<{ accepts: Array<{ amount: string }> }>(
    result.headers["x-payment-required"]!
  );
  assert.equal(decoded?.accepts[0]?.amount, "80000"); // 0.08 USDC atomic
});

test("cashbackEnabled emits a log line, doesn't change the response", async () => {
  const logs: Array<{ event: string; cashback_bps?: number }> = [];
  const { execute } = createPaywall(
    baseConfig({
      cashbackEnabled: true,
      cashbackBps: 200,
      logger: {
        info: (f) => logs.push(f as { event: string; cashback_bps?: number }),
        warn: () => {},
        error: () => {},
      },
    })
  );
  const result = await execute({
    method: "POST",
    url: "/api/agent",
    headers: {
      "content-type": "application/json",
      [X402_PAYMENT_HEADER]: paymentHeaderFor(newAgentKey()),
    },
    body: {},
  });
  assert.equal(result.kind, "paid");
  const cashback = logs.find((l) => l.event === "paywall.cashback_owed");
  assert.ok(cashback, "cashback log line missing");
  assert.equal(cashback?.cashback_bps, 200);
});
