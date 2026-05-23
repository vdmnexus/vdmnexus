# @vdm-nexus/mastra-provider

> **Beta** — API stable, mainnet live. v1 ships at $NEXUS launch.

[Mastra](https://mastra.ai) provider for [VDM Nexus](https://vdmnexus.com)
— **signed inference** in a one-import Mastra `Agent` constructor.

```ts
import { Agent } from "@mastra/core";
import { nexusModel } from "@vdm-nexus/mastra-provider";

const researcher = new Agent({
  name: "Researcher",
  model: nexusModel({
    secretKey: process.env.AGENT_SECRET_KEY!,
    model: "openai/gpt-4o-mini",
  }),
});

const result = await researcher.generate("Explain signed inference.");
console.log(result.text);
console.log(result.providerMetadata?.nexus?.receipt); // SIR v2 receipt
```

Each call pays 0.01 USDC via x402 (Solana mainnet or Base mainnet) and the
SIR v2 signed-inference receipt rides along on `providerMetadata.nexus.receipt`.

## Why this is a thin wrapper

Mastra is built on top of the Vercel AI SDK. Any `LanguageModelV3` is a
valid `model` argument to `new Agent({...})`. That means
[`@vdm-nexus/ai-sdk-provider`](../ai-sdk-provider) — which **is** an AI
SDK provider — works inside Mastra natively. This package just exposes
`nexusModel({...})` as a one-liner so the typical Mastra agent file stays
compact.

If you want the full provider surface (multiple model ids off the same
agent, custom headers, etc.), import directly:

```ts
import { createNexus } from "@vdm-nexus/ai-sdk-provider";
const nexus = createNexus({ secretKey });
new Agent({ name: "fast",   model: nexus("openai/gpt-4o-mini") });
new Agent({ name: "reason", model: nexus("anthropic/claude-3-haiku") });
```

`createNexus` is also re-exported from this package, so a single
`@vdm-nexus/mastra-provider` install covers both styles.

## Funding your agent

Your `AGENT_SECRET_KEY` is **also a Solana wallet**. Fund it with USDC on
Solana mainnet before paying for real inference. The zero-friction path is
the live playground at **https://vdmnexus.com/playground** — generate a
key, run a one-shot sponsored call, inspect the receipt, then plug the
same key into this Mastra provider.

```bash
# Generate a 64-byte tweetnacl secret (base58).
node -e 'const n = require("tweetnacl"); const bs = require("bs58").default; \
  console.log(bs.encode(n.sign.keyPair().secretKey));'
```

## API

### `nexusModel(settings)`

```ts
nexusModel({
  secretKey?: string,           // base58 64-byte tweetnacl secret, OR
  agent?: X402Agent,            // a pre-built @vdm-nexus/x402 agent
  endpoint?: string,            // default: https://nexus.vdmnexus.com/api/v1
  network?: string,             // CAIP-2; default: server's X402_NETWORK
  model: string,                // REQUIRED — OpenRouter slug
  headers?: Record<string, string>,
  fetch?: typeof fetch,
}): LanguageModelV3
```

### `createNexusProvider(settings)`

Identical to `createNexus` from `@vdm-nexus/ai-sdk-provider`. Re-exported
here under both names for ergonomic Mastra-side usage.

## Reading the receipt

After any successful agent call the receipt sits at:

```ts
result.providerMetadata?.nexus?.receipt   // SirX402 — the SIR v2 receipt
result.providerMetadata?.nexus?.payment   // X402PaymentResponse
```

`receipt.payment.tx_signature` is the on-chain settlement; verify via
[`verify.vdmnexus.com`](https://verify.vdmnexus.com) or the SDK's
`verifyReceipt`.

## Demo / proof

The example script under `examples/agent.ts` runs against mainnet.
Recent demo receipt:

> https://vdmnexus.com/r/749fa37c

```bash
AGENT_SECRET_KEY=… NEXUS_NETWORK=solana:mainnet \
  pnpm --filter @vdm-nexus/mastra-provider exec tsx examples/agent.ts
```

## License

MIT.
