/**
 * Round-trip test: mocked fetch issues a 402 challenge on the first POST,
 * then accepts the X-Payment retry and returns a fake chat-completion body
 * plus a signed-receipt header. We assert:
 *
 *   1. The provider's custom fetch did the two-roundtrip handshake.
 *   2. The body returned to AI SDK carries the spliced `_nexus` payload.
 *   3. The metadata extractor maps that into `providerMetadata.nexus`.
 *
 * We don't import `ai` because that pulls a peer-dep. Instead we drive
 * `doGenerate` on the underlying LanguageModelV3 directly — that's the
 * exact surface AI SDK uses when `generateText` is called.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { X402Agent } from "@vdm-nexus/x402";

import { createNexus } from "../provider.js";

const FAKE_RECIPIENT = "GqYU2X4tQMjFmHnxYbN3VFx5tQv2eYZBXqRvWcF4Aaaa";
const FAKE_USDC = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

function encodeB64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

function fakeReceipt(agentPubkey: string) {
  return {
    v: 2,
    agent_pubkey: agentPubkey,
    model: "openai/gpt-4o-mini",
    cost_usdc: 0.0008,
    prompt_hash: "a".repeat(64),
    response_hash: "b".repeat(64),
    timestamp: Date.now(),
    inference_id: 12345,
    points_total: 1,
    upstream: "openrouter",
    payment: {
      scheme: "x402",
      amount_usdc: 0.01,
      tx_signature: "MOCK_TX_SIGNATURE",
      network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
      pay_to: FAKE_RECIPIENT,
    },
    nexus_signature: "MOCK_SIGNATURE",
  };
}

function fakePaymentResponse() {
  return {
    status: "settled",
    txSignature: "MOCK_TX_SIGNATURE",
    network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  };
}

function fakeChallenge() {
  return {
    x402Version: 2,
    accepts: [
      {
        scheme: "exact",
        network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        maxAmountRequired: "10000",
        amount: "10000",
        resource: "https://example.com/api/v1/chat/completions",
        description: "Nexus inference",
        mimeType: "application/json",
        payTo: FAKE_RECIPIENT,
        maxTimeoutSeconds: 60,
        asset: FAKE_USDC,
      },
    ],
  };
}

function fakeChatCompletion() {
  return {
    id: "chatcmpl-test",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "openai/gpt-4o-mini",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "pong" },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  };
}

/**
 * Build a mocked fetch: first POST → 402 + challenge, second POST → 200 +
 * body + receipt headers. Streams all the values we want to assert on
 * back through `calls` so the test can check the handshake actually happened.
 */
function mockFetch(agentPubkey: string) {
  const calls: { method: string; url: string; headers: Record<string, string>; body: string }[] = [];

  const impl: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const headers: Record<string, string> = {};
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => {
          headers[k] = v;
        });
      } else if (Array.isArray(init.headers)) {
        for (const [k, v] of init.headers) headers[k] = v;
      } else {
        Object.assign(headers, init.headers as Record<string, string>);
      }
    }
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push({ method: init?.method ?? "GET", url, headers, body });

    const hasPayment =
      "x-payment" in headers || "X-Payment" in headers;

    if (!hasPayment) {
      return new Response("{}", {
        status: 402,
        headers: {
          "content-type": "application/json",
          "x-payment-required": encodeB64(fakeChallenge()),
        },
      });
    }

    return new Response(JSON.stringify(fakeChatCompletion()), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-nexus-receipt": encodeB64(fakeReceipt(agentPubkey)),
        "x-payment-response": encodeB64(fakePaymentResponse()),
      },
    });
  };

  return { impl, calls };
}

test("createNexus wraps openai-compatible with x402 handshake + receipt metadata", async () => {
  const agent = X402Agent.generate();
  // Stub the on-chain payment construction. The real implementation hits
  // Solana RPC to fetch the USDC mint, which we don't want in tests.
  agent.buildPaymentPayload = async () => ({
    x402Version: 2,
    scheme: "exact",
    network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    payload: {
      payer: agent.pubkey,
      transaction: "base64-fake-signed-tx",
    },
  }) as never;

  const { impl: mock, calls } = mockFetch(agent.pubkey);

  const provider = createNexus({
    agent,
    endpoint: "https://example.com/api/v1",
    fetch: mock,
  });

  const model = provider("openai/gpt-4o-mini");
  const result = await model.doGenerate({
    prompt: [{ role: "user", content: [{ type: "text", text: "ping" }] }],
  });

  // Handshake happened: probe + paid.
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.method, "POST");
  assert.equal(calls[0]?.url, "https://example.com/api/v1/chat/completions");
  const probeHeaderKeys = Object.keys(calls[0]!.headers).map((k) => k.toLowerCase());
  assert.ok(!probeHeaderKeys.includes("x-payment"), "probe must NOT have X-Payment");

  const paidHeaderKeys = Object.keys(calls[1]!.headers).map((k) => k.toLowerCase());
  assert.ok(paidHeaderKeys.includes("x-payment"), "paid retry must carry X-Payment");

  // Model returned the assistant text from the mocked body.
  const text = result.content.find((part) => part.type === "text");
  assert.ok(text, "expected text content");
  assert.equal((text as { type: "text"; text: string }).text, "pong");

  // Receipt flowed through to providerMetadata.nexus.
  const nexusMeta = result.providerMetadata?.nexus as
    | { receipt?: { v?: number; agent_pubkey?: string }; payment?: { txSignature?: string } }
    | undefined;
  assert.ok(nexusMeta, "providerMetadata.nexus missing");
  assert.equal(nexusMeta.receipt?.v, 2);
  assert.equal(nexusMeta.receipt?.agent_pubkey, agent.pubkey);
  assert.equal(nexusMeta.payment?.txSignature, "MOCK_TX_SIGNATURE");
});

test("createNexus throws if neither secretKey nor agent is given", () => {
  assert.throws(() => createNexus({} as never), /requires either `secretKey` or `agent`/);
});

test("createNexus accepts a base58 secretKey directly", () => {
  const agent = X402Agent.generate();
  const provider = createNexus({
    secretKey: agent.secretKeyBase58,
    endpoint: "https://example.com/api/v1",
  });
  // Smoke: the provider is callable.
  const model = provider("openai/gpt-4o-mini");
  assert.equal(model.specificationVersion, "v3");
});
