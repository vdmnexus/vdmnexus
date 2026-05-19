# @vdm-nexus/x402

Pay-per-call AI inference. An x402 client for [VDM Nexus](https://vdmnexus.com)
and any other [x402-spec-v2](https://github.com/coinbase/x402) endpoint that
accepts Solana USDC.

```ts
import { X402Agent } from "@vdm-nexus/x402";

const agent = X402Agent.generate();
const reply = await agent.payAndInfer("https://nexus.vdmnexus.com/api/v1", {
  model: "openai/gpt-4o-mini",
  messages: [{ role: "user", content: "Why Ed25519?" }],
});

console.log(reply.openai.choices[0].message.content);
console.log(reply.receipt.cost_usdc);          // real OpenRouter cost
console.log(reply.payment.txSignature);        // Solana tx that settled
```

## What this does, in three sentences

The agent's Ed25519 keypair is *also* a Solana keypair (same curve). On each
`payAndInfer`, the SDK probes the endpoint to get the x402 challenge, builds
a signed SPL USDC transfer for the declared amount and recipient, and sends
it in the `X-Payment` header. The endpoint's facilitator verifies, co-signs
as fee payer, broadcasts to Solana, runs the inference, and hands you back
the OpenAI response plus a signed receipt of what just happened.

## Why this is a separate package from `@vdm-nexus/sdk`

The lean SDK (`@vdm-nexus/sdk`) deliberately ships with **two** runtime
dependencies — `tweetnacl` and `bs58`. That keeps `npm install @vdm-nexus/sdk`
honest for everyone who only wants the prepaid Ed25519-signed-request flow.

x402 requires the Solana toolchain (`@solana/kit`, `@x402/svm`, `@x402/core`)
to construct signed SPL transfers. We don't want to push that weight onto
people who only need the prepaid flow, so the on-chain bits live in this
package and you opt in by installing it.

```bash
# Prepaid flow only (two deps, light):
npm install @vdm-nexus/sdk

# x402 pay-per-call (this package; pulls Solana deps):
npm install @vdm-nexus/x402
```

`X402Agent` extends the base `Agent`, so anything you can do with the
prepaid SDK you can still do here — including reusing the same keypair
across both payment models.

## API

### `X402Agent.generate(): X402Agent`
Fresh random Ed25519 keypair.

### `X402Agent.fromBase58(secretKeyBase58: string): X402Agent`
Restore from the 64-byte secret (32-byte seed + 32-byte pubkey).

### `agent.payAndInfer(endpoint, { model, messages }): Promise<X402ChatResponse>`
Two-roundtrip x402 handshake. Returns:

```ts
type X402ChatResponse = {
  openai: OpenAIChatCompletion;            // OpenAI-shape response body
  receipt: NexusReceipt | null;            // x-nexus-receipt header, parsed
  payment: X402PaymentResponse | null;     // x-payment-response header, parsed
};
```

Throws:
- `X402PaymentRequiredError` — facilitator rejected the payment (verify failed)
- `X402PaymentReplayError` — same `tx_signature` was already credited (HTTP 409)
- `X402UpstreamError` — anything else upstream went wrong (e.g. OpenRouter)

## Status

`0.1.0`. Devnet only — see the [VDM Nexus README](https://github.com/vdmnexus/vdmnexus)
for the mainnet roadmap.

## License

MIT.
