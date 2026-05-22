# @coinbase/agentkit-vdm-nexus

AgentKit action provider for [VDM Nexus](https://vdmnexus.com) — signed
inference via [x402](https://github.com/coinbase/x402) on Solana and Base.

Every paid `nexus_chat` call returns an OpenAI chat completion plus a
Signed Inference Receipt (SIR v2) anchored to an on-chain USDC settlement
tx. Receipts are independently verifiable with `nexus_verify_receipt`
against the operator's published Ed25519 public key.

First mainnet receipt: <https://vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e>

## Install

```bash
npm install @coinbase/agentkit-vdm-nexus @coinbase/agentkit
```

## Usage

```ts
import { AgentKit, SolanaKeypairWalletProvider } from "@coinbase/agentkit";
import { vdmNexusActionProvider } from "@coinbase/agentkit-vdm-nexus";

const walletProvider = await SolanaKeypairWalletProvider.fromNetwork(
  "solana-mainnet",
  process.env.SOLANA_PRIVATE_KEY!,
);

const agentKit = await AgentKit.from({
  walletProvider,
  actionProviders: [vdmNexusActionProvider()],
});
```

That's it. The wallet attached to AgentKit IS the agent identity — its
keypair signs the SPL USDC transfer carried in the x402 `X-Payment`
header. No separate `AGENT_SECRET_KEY` environment variable is required.

## Actions

| Action | Purpose |
|---|---|
| `nexus_chat` | Pay-per-call signed inference. Settles a USDC payment inline via x402 and returns the OpenAI response plus a SIR v2 receipt. |
| `nexus_verify_receipt` | Run the five-check SIR v2 verifier against a receipt, prompt, and response. Confirms hashes, operator signature, on-chain settlement, and payer identity. |
| `nexus_get_deposit_address` | Discover the on-chain USDC deposit address for prepaid credit top-ups. Per-call x402 settlement does not need this — it's for agents that batch deposits. |

## Configuration

```ts
vdmNexusActionProvider({
  // Point at a different deployment (e.g. self-hosted)
  endpoint: "https://nexus.example.com/api/v1",

  // Pin the operator pubkey for offline verification. When omitted, it's
  // fetched from `${endpoint}/operator-key`.
  operatorKey: "<base58 Ed25519 pubkey>",
});
```

## What this enables

- **Audit trails.** Every inference call carries a tamper-evident receipt
  the caller can verify cryptographically. Useful for compliance regimes
  that require evidence of what a model returned (EU AI Act Article 12,
  NIST AI agent standards, OWASP LLM Top 10 logging requirements).
- **Trustless multi-agent flows.** Agent A can hand Agent B a receipt and
  Agent B can verify it without trusting Agent A — the operator's
  Ed25519 signature + the on-chain settlement record are the trust
  anchor.
- **Pay-per-call autonomy.** No prepaid balance to babysit; the wallet
  pays inline. Top-ups via `nexus_get_deposit_address` are an
  optimization, not a prerequisite.

## Networks

| Network | CAIP-2 | Status |
|---|---|---|
| Solana mainnet | `solana:mainnet` | Live |
| Solana devnet | `solana:devnet` | Live |
| Base mainnet | `eip155:8453` | Live |
| Base Sepolia | `eip155:84532` | Live |

The action provider's `supportsNetwork` returns true for any Solana
(`svm`) network. Settling against Base via this provider works today by
passing `network: "eip155:8453"` to `nexus_chat` — the wallet still
signs as Solana, but the facilitator settles on Base. A first-class EVM
wallet binding is a follow-up.

## Specification

The Signed Inference Receipt v2 wire format and verification rules are
documented at <https://docs.vdmnexus.com/docs/spec/sir-v2>.

## License

Apache-2.0 (matches the rest of AgentKit).
