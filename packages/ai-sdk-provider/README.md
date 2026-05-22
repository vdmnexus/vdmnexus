# @vdm-nexus/ai-sdk-provider

[Vercel AI SDK](https://sdk.vercel.ai) provider for
[VDM Nexus](https://vdmnexus.com) — **signed inference** with one import.

Every call to the AI SDK pays in USDC via x402, and every response carries
a cryptographic receipt of exactly what the model returned. The handshake
is invisible; the receipt is on `providerMetadata.nexus.receipt`.

```ts
import { createNexus } from "@vdm-nexus/ai-sdk-provider";
import { generateText } from "ai";

const nexus = createNexus({ secretKey: process.env.AGENT_SECRET_KEY! });
const result = await generateText({
  model: nexus("openai/gpt-4o-mini"),
  prompt: "Explain signed inference in one sentence.",
});
console.log(result.text);
console.log(result.providerMetadata?.nexus?.receipt);
```

## Funding your agent

Your `AGENT_SECRET_KEY` is **also a Solana wallet**. Before the first paid
call, fund it with USDC on Solana mainnet (or Base mainnet). The cheapest
way to try this end-to-end without managing a wallet at all is the live
playground at **https://vdmnexus.com/playground** — generate a key in the
browser, run a one-shot sponsored call, and inspect the receipt.

To run the SDK against a real agent:

```bash
# Generate a fresh 64-byte tweetnacl secret in base58 form.
node -e 'const n = require("tweetnacl"); const bs = require("bs58").default; \
  console.log(bs.encode(n.sign.keyPair().secretKey));'

# Print the matching pubkey (= your Solana wallet address).
node -e 'const n = require("tweetnacl"); const bs = require("bs58").default; \
  const sk = bs.decode(process.env.AGENT_SECRET_KEY); \
  console.log(bs.encode(sk.slice(32)));'

# Send USDC to that pubkey on Solana mainnet (any wallet works).
```

Per-call default is 0.01 USDC. Topping up a few dollars covers hundreds of
calls.

## API

### `createNexus(settings)`

```ts
createNexus({
  secretKey?: string,           // base58 64-byte tweetnacl secret, OR
  agent?: X402Agent,            // a pre-built @vdm-nexus/x402 agent
  endpoint?: string,            // default: https://nexus.vdmnexus.com/api/v1
  network?: string,             // CAIP-2; default: server's X402_NETWORK
  name?: string,                // providerMetadata key; default: "nexus"
  headers?: Record<string, string>,
  fetch?: typeof fetch,         // optional underlying transport
}): NexusProvider
```

Returns the same callable shape as `@ai-sdk/openai`:

```ts
const nx = createNexus({ secretKey });
nx("openai/gpt-4o-mini")             // → LanguageModelV3
nx.chatModel("openai/gpt-4o-mini")   // explicit chat model
```

### Reading the receipt

After any successful call, the SIR v2 receipt sits at:

```ts
result.providerMetadata?.nexus?.receipt    // SirX402 | null
result.providerMetadata?.nexus?.payment    // X402PaymentResponse | null
```

`receipt.payment.tx_signature` is the on-chain settlement; verify it via
[`@vdm-nexus/x402`'s `verifyReceipt`](../x402) or the hosted verifier at
[`verify.vdmnexus.com`](https://verify.vdmnexus.com).

### `nexus(modelId)`

Lazy convenience that reads `process.env.AGENT_SECRET_KEY` on first call.
For non-trivial use prefer `createNexus({...})` so secrets are explicit.

## Streaming

`streamText` works — but the underlying `/chat/completions` endpoint
currently returns a fully-buffered response, so the AI SDK exposes the
single chunk as a stream of one. Real SSE arrives in a future Nexus release;
this provider will transparently upgrade.

## Mastra

[`@vdm-nexus/mastra-provider`](../mastra-provider) wraps this package for
the [Mastra](https://mastra.ai) agent framework with the same import shape.

## Demo / proof

The example script under `examples/generate-text.ts` runs against
mainnet. Recent demo receipt:

> https://vdmnexus.com/r/749fa37c

Run the demo yourself:

```bash
AGENT_SECRET_KEY=… NEXUS_NETWORK=solana:mainnet \
  pnpm --filter @vdm-nexus/ai-sdk-provider exec tsx examples/generate-text.ts
```

## License

MIT.
