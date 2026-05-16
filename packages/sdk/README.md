# @vdmnexus/sdk

> Open-source SDK for [VDM Nexus](https://vdmnexus.com) — autonomous agents
> that authenticate and pay for compute with a Solana keypair. No API keys.

[![npm](https://img.shields.io/npm/v/@vdmnexus/sdk.svg)](https://www.npmjs.com/package/@vdmnexus/sdk)
[![license](https://img.shields.io/npm/l/@vdmnexus/sdk.svg)](./LICENSE)

## Install

```bash
npm install @vdmnexus/sdk
```

Two tiny dependencies: `tweetnacl` and `bs58`. No `@solana/web3.js` until
you need wallet operations.

## Use

```ts
import { Agent } from "@vdmnexus/sdk";

// Generate a fresh agent — or load from a secret key string.
const agent = Agent.generate();
// const agent = Agent.fromBase58(process.env.AGENT_SECRET_KEY!);

console.log("agent pubkey:", agent.pubkey);

const reply = await agent.inference("https://nexus.vdmnexus.com/api/v1", {
  prompt: "Explain Ed25519 signatures in one sentence.",
  task_type: "fast", // "fast" | "reasoning" | "general"
});

console.log(reply.result);
console.log("cost:", reply.receipt?.cost_usdc, "USDC");
console.log("balance:", reply.receipt?.balance_remaining, "USDC");
```

## How it works

Every request is signed with the agent's Ed25519 secret key. The Nexus API
verifies the signature against the agent's public key over the raw body
bytes, checks the nonce hasn't been reused, checks the timestamp is fresh,
debits the agent's USDC balance, and returns the completion plus a tamper-
proof receipt.

There are no API keys to rotate, leak, or scope. The public key is the
identity.

## API

### `Agent.generate(): Agent`

Generate a fresh Ed25519 keypair.

### `Agent.fromBase58(secretKey: string): Agent`

Load an agent from a base58-encoded 64-byte secret key.

### `agent.pubkey: string`

The agent's base58-encoded public key. This is the identity.

### `agent.secretKeyBase58: string`

The agent's full base58-encoded secret key. **Treat as a password.** Never
log this or commit it to source control.

### `agent.inference(endpoint, opts): Promise<InferenceResponse>`

Make a signed inference request to a Nexus endpoint.

```ts
type InferenceOptions = {
  prompt: string;
  task_type?: "fast" | "reasoning" | "general"; // default "general"
  max_cost_usdc?: number;
};

type InferenceResponse = {
  ok: boolean;
  result?: string;
  receipt?: {
    agent_pubkey: string;
    provider: string;        // "groq" | "anthropic" | "openai"
    model: string;
    cost_usdc: number;
    balance_remaining: number;
    prompt_hash: string;     // sha256 of prompt
    response_hash: string;   // sha256 of result text
    timestamp: number;
    inference_id: string | null;
  };
  error?: string;
  detail?: string;
};
```

### `agent.signBody(body: string): string`

Lower-level: sign an arbitrary JSON body and return the base58 signature.
Useful if you're building your own request flow.

## Status

Devnet only. Mainnet is coming after on-chain USDC deposit detection has
been stress-tested.

## Repo

Source lives in the [monorepo](https://github.com/2504VDM/vdmnexus) under
`packages/sdk`.

## License

MIT — see [LICENSE](./LICENSE).
