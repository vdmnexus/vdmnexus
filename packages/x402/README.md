# @vdm-nexus/x402

**Signed inference** for AI agents. An x402 client + receipt verifier for
[VDM Nexus](https://vdmnexus.com) and any other
[x402-spec-v2](https://github.com/coinbase/x402) endpoint that accepts
USDC on Solana or Base.

Every call returns a cryptographic receipt of exactly what the model
returned — that's the wedge. *Signed inference* = inference call +
on-chain payment + signed receipt the caller can verify and downstream
systems can audit.

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
  receipt: SirX402 | null;                 // x-nexus-receipt header, parsed
  payment: X402PaymentResponse | null;     // x-payment-response header, parsed
};
```

Throws:
- `X402PaymentRequiredError` — facilitator rejected the payment (verify failed)
- `X402PaymentReplayError` — same `tx_signature` was already credited (HTTP 409)
- `X402UpstreamError` — anything else upstream went wrong (e.g. OpenRouter)

### `verifyReceipt(params): Promise<VerifyReceiptResult>`

End-to-end verifier for v=2 Signed Inference Receipts. Recomputes
`prompt_hash` and `response_hash`, verifies the Ed25519
`nexus_signature` against the operator pubkey (auto-fetched from the
endpoint or supplied via `operatorKey`), and confirms the on-chain
USDC transfer.

Supports both spec-normative chain bindings:

- **Solana** (`solana:…` genesis-hash CAIP-2) — looks up the tx via
  `getTransaction` and walks pre/post token balances.
- **Base / EVM** (`eip155:8453`, `eip155:84532`) — calls
  `eth_getTransactionReceipt` and confirms a USDC `Transfer` event
  from the canonical USDC contract.

`params.prompt` and `params.response` accept either the OpenAI-shape
objects (for x402 chat-completion receipts) or raw strings (for
prepaid `/v1/inference` receipts). See [spec §13](https://docs.vdmnexus.com/docs/spec/sir-v2#13-chain-bindings)
for the per-chain verification rules.

## Status

`0.3.x`. Devnet only — see the [VDM Nexus README](https://github.com/vdmnexus/vdmnexus)
for the mainnet roadmap.

## License

MIT.
