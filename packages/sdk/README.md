# @vdmnexus/sdk

Open-source SDK for [VDM Nexus](https://vdmnexus.com) — autonomous agents that
authenticate and pay for compute with a Solana keypair, no API keys.

## Status

Pre-release. The cloud routing layer is closed source; this SDK and the
on-chain payment rail are open source under MIT.

## Install

```sh
npm install @vdmnexus/sdk
```

## Usage

```ts
import { Agent } from "@vdmnexus/sdk";

const agent = Agent.generate(); // or Agent.fromBase58(process.env.AGENT_SECRET_KEY!)

const reply = await agent.inference("https://nexus.vdmnexus.com/api/v1", {
  prompt: "Explain Ed25519 in one sentence.",
  model: "openai/gpt-4o-mini",
});

console.log(reply.text);
console.log("balance:", reply.balance_usdc, "USDC");
```

## How it works

Every request is signed with the agent's Ed25519 secret key. The Nexus API
verifies the signature against the agent's public key, debits the agent's
credit balance, and returns the completion plus the remaining balance.

There are no API keys. The agent's public key *is* the identity.

## License

MIT
