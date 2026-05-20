# Changelog

All notable changes to `@vdm-nexus/x402` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the package follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.3.0 — 2026-05-20

### Added

- **Base (EVM) verification path.** `verifyReceipt` now resolves x402
  receipts settled on Base mainnet (`eip155:8453`) and Base Sepolia
  (`eip155:84532`). The verifier calls `eth_getTransactionReceipt`,
  asserts the tx succeeded (`status === "0x1"`), and walks the logs for
  a USDC `Transfer(address,address,uint256)` event from the canonical
  USDC contract for the chain — confirming `topics[2]` (`to`) matches
  `payment.pay_to`, the value is `>= amount_usdc * 1e6`, and
  `topics[1]` (`from`) matches `agent_pubkey`. Transfer events from
  any non-canonical contract are rejected (prevents spoofing via
  worthless ERC-20s). Default RPCs: `https://mainnet.base.org` and
  `https://sepolia.base.org`. See the
  [SIR v2 spec §13.2](https://docs.vdmnexus.com/docs/spec/sir-v2#132-base-evm)
  for the normative verification rules.

### Changed

- **`NexusReceipt` is now a discriminated union** of `SirPrepaid | SirX402`
  (also exported as `SignedInferenceReceipt`). Receipts with `payment`
  are `SirX402`; receipts without are `SirPrepaid`. Variant-specific
  fields (`provider`, `balance_remaining` on prepaid; `upstream`,
  `payment` on x402) are typed `?: never` on the opposite variant, so
  TypeScript narrows correctly via `if (receipt.payment)`. New code
  SHOULD prefer the `SignedInferenceReceipt` alias.
- **`verifyReceipt` now accepts `prompt: ChatMessage[] | string` and
  `response: OpenAIChatCompletion | string`** so the same call site
  works for both `/v1/chat/completions` receipts (OpenAI shape) and
  `/v1/inference` prepaid receipts (raw strings). The hash construction
  matches the variant per spec §10.
- **`payment.pay_to` is now required on v=2 receipts** (was optional in
  0.2.x). Receipts emitted by spec-compliant operators have always
  included it; this just tightens the TypeScript type to match.

### Notes

- No wire-format change. v=2 receipts emitted by 0.2.x operators
  continue to verify under 0.3.x — the discriminated union, EVM
  network handling, and stricter `pay_to` requirement are all backward-
  compatible at the JSON level.
- `X402Agent.payAndInfer` is unchanged on the wire; its return type
  narrows to `receipt: SirX402 | null` since chat-completion receipts
  are always the x402 variant.

## 0.2.2 — 2026-05-19

- `verifyReceipt`: fixed `payer_matches` to accept the agent as any
  transaction signer rather than only the fee payer (consolidated
  x402-svm topologies put the facilitator at signer index 0). Added a
  ~120s retry envelope for `getTransaction` RPC lookups to absorb
  Solana devnet's indexing lag.

## 0.2.0 — 2026-05-19

- Initial publication of `verifyReceipt`. End-to-end verifier for v=2
  Signed Inference Receipts: recomputes `prompt_hash` and
  `response_hash`, verifies the Ed25519 `nexus_signature` against the
  operator pubkey (auto-fetched from the endpoint or supplied
  out-of-band), and confirms the on-chain USDC transfer on Solana.
