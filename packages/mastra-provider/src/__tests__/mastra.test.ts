/**
 * Mirrors the AI SDK provider test: round-trip a mocked fetch and assert
 * the receipt lands in the model's providerMetadata. Mastra wraps the
 * underlying LanguageModelV3, so if metadata flows correctly here it
 * flows correctly through Mastra's agent surface too.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { X402Agent } from "@vdm-nexus/x402";

import { nexusModel, createNexusProvider } from "../mastra.js";

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
    inference_id: 42,
    points_total: 1,
    upstream: "openrouter",
    payment: {
      scheme: "x402",
      amount_usdc: 0.01,
      tx_signature: "MOCK_TX_SIGNATURE_MASTRA",
      network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
      pay_to: FAKE_RECIPIENT,
    },
    nexus_signature: "MOCK_SIG",
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

function fakeCompletion() {
  return {
    id: "chatcmpl-test",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "openai/gpt-4o-mini",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "mastra-ok" },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  };
}

function mockFetch(agentPubkey: string): typeof fetch {
  return async (_input, init) => {
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
    const hasPayment =
      Object.keys(headers).some((k) => k.toLowerCase() === "x-payment");

    if (!hasPayment) {
      return new Response("{}", {
        status: 402,
        headers: {
          "content-type": "application/json",
          "x-payment-required": encodeB64(fakeChallenge()),
        },
      });
    }
    return new Response(JSON.stringify(fakeCompletion()), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-nexus-receipt": encodeB64(fakeReceipt(agentPubkey)),
      },
    });
  };
}

test("nexusModel() returns a LanguageModel that surfaces the receipt", async () => {
  const agent = X402Agent.generate();
  // Stub on-chain payment construction — see the ai-sdk-provider test for
  // why. We don't want to fetch the USDC mint over the wire in unit tests.
  agent.buildPaymentPayload = async () => ({
    x402Version: 2,
    scheme: "exact",
    network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    payload: {
      payer: agent.pubkey,
      transaction: "base64-fake-signed-tx",
    },
  }) as never;

  const model = nexusModel({
    agent,
    endpoint: "https://example.com/api/v1",
    fetch: mockFetch(agent.pubkey),
    model: "openai/gpt-4o-mini",
  });

  assert.equal(model.specificationVersion, "v3");

  const result = await model.doGenerate({
    prompt: [{ role: "user", content: [{ type: "text", text: "ping" }] }],
  });

  const text = result.content.find((part) => part.type === "text");
  assert.equal((text as { type: "text"; text: string } | undefined)?.text, "mastra-ok");

  const meta = result.providerMetadata?.nexus as
    | { receipt?: { v?: number; payment?: { tx_signature?: string } } }
    | undefined;
  assert.ok(meta?.receipt, "receipt missing from providerMetadata.nexus");
  assert.equal(meta.receipt.v, 2);
  assert.equal(meta.receipt.payment?.tx_signature, "MOCK_TX_SIGNATURE_MASTRA");
});

test("createNexusProvider() is the same provider as the underlying ai-sdk one", () => {
  const agent = X402Agent.generate();
  const provider = createNexusProvider({
    agent,
    endpoint: "https://example.com/api/v1",
  });
  const model = provider("openai/gpt-4o-mini");
  assert.equal(model.specificationVersion, "v3");
});
