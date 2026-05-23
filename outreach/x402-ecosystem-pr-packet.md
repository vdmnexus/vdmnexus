# PR packet — list VDM Nexus on `x402.org/ecosystem`

`x402.direct` auto-crawls `x402.org/ecosystem` (alongside the
`awesome-x402` GitHub list, which is already done) every 6 hours.
Landing on the ecosystem page is the cheapest path into the
x402.direct index.

The source of truth for the ecosystem page lives in the
[`coinbase/x402`](https://github.com/coinbase/x402) repo. Fork, add
the entry below, open a PR.

## Where to add the entry

Most likely path (verify before submitting): the ecosystem entries are
in markdown under `coinbase/x402/site/ecosystem/` or in a JSON manifest
under `coinbase/x402/data/ecosystem.json`. Open the repo, grep for
existing entries (e.g. "Firecrawl", "CoinGecko") to find the canonical
file, then add the snippet below in the appropriate format.

If the repo has switched to a categorised structure, file under
**Inference** (or **Reasoning** — match the existing taxonomy).

## Entry (Markdown — for a list-style ecosystem page)

```md
### VDM Nexus

Signed-inference rail for autonomous AI agents. Pay-per-call LLM access
via x402 on Solana mainnet and Base mainnet; every response carries an
Ed25519-signed [SIR v2 receipt](https://docs.vdmnexus.com/docs/spec/sir-v2)
that anyone can re-verify against the operator key.

- **Endpoint:** `https://nexus.vdmnexus.com/api/v1/chat/completions`
- **Networks:** `solana:mainnet`, `eip155:8453` (Base mainnet),
  `solana:devnet`, `eip155:84532` (Base Sepolia)
- **OpenAI-compatible:** drops into any `OpenAI(base_url=...)` client
- **Docs:** [docs.vdmnexus.com](https://docs.vdmnexus.com)
- **Playground:** [vdmnexus.com/playground](https://vdmnexus.com/playground)
- **Verify:** [verify.vdmnexus.com](https://verify.vdmnexus.com)
- **Source:** [github.com/vdmnexus/vdmnexus](https://github.com/vdmnexus/vdmnexus)
- **npm:** `@vdm-nexus/sdk`, `@vdm-nexus/x402`, `@vdm-nexus/paywall`,
  `@vdm-nexus/mcp`, `@vdm-nexus/ai-sdk-provider`,
  `@vdm-nexus/mastra-provider`
- **PyPI:** `vdm-nexus`, `langchain-vdm-nexus`
- **Agent card:** [vdmnexus.com/.well-known/agent-registration.json](https://vdmnexus.com/.well-known/agent-registration.json)
```

## Entry (JSON — for a structured manifest)

```json
{
  "name": "VDM Nexus",
  "category": "Inference",
  "description": "Signed-inference rail. Pay-per-call LLM access via x402 on Solana mainnet and Base mainnet; every response carries an Ed25519-signed SIR v2 receipt.",
  "endpoint": "https://nexus.vdmnexus.com/api/v1/chat/completions",
  "networks": [
    "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp4vehk2",
    "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
    "eip155:8453",
    "eip155:84532"
  ],
  "homepage": "https://vdmnexus.com",
  "documentation": "https://docs.vdmnexus.com",
  "source": "https://github.com/vdmnexus/vdmnexus",
  "playground": "https://vdmnexus.com/playground",
  "verifier": "https://verify.vdmnexus.com",
  "agentCard": "https://vdmnexus.com/.well-known/agent-registration.json",
  "tags": ["inference", "openai-compatible", "ed25519", "sir-v2", "receipts"]
}
```

## PR title

```
Add VDM Nexus to the ecosystem — signed-inference rail with SIR v2 receipts
```

## PR body

```md
Adds VDM Nexus to the ecosystem page.

**What:** an OpenAI-compatible `/chat/completions` endpoint where every
response carries an Ed25519-signed [SIR v2 receipt](https://docs.vdmnexus.com/docs/spec/sir-v2)
covering the prompt hash, response hash, model, cost, and on-chain
payment. Verifiable end-to-end without trusting Nexus.

**Networks:** Solana mainnet and Base mainnet (`solana:mainnet`,
`eip155:8453`), plus their testnets.

**Receipts shipping in production today.** Latest mainnet smoke:
[vdmnexus.com/r/0d3a5b26-d688-4d93-bfdc-7555b1324ac1](https://vdmnexus.com/r/0d3a5b26-d688-4d93-bfdc-7555b1324ac1).

**Try without signup:** [vdmnexus.com/playground](https://vdmnexus.com/playground).
Verifier on a separate domain so the trust loop is independent:
[verify.vdmnexus.com](https://verify.vdmnexus.com).

**Agent card:** publishes an ERC-8004-shape card at
[vdmnexus.com/.well-known/agent-registration.json](https://vdmnexus.com/.well-known/agent-registration.json).

Happy to revise category / structure to match your conventions —
flagged based on existing entries but couldn't verify the canonical
shape from the docs.
```

## Submission steps

1. Fork `coinbase/x402`.
2. Locate the ecosystem entries (grep `Firecrawl` or `CoinGecko`).
3. Add the Markdown or JSON entry above matching the existing format.
4. Open the PR with the title + body above.
5. Cross-post a short note in the CDP Developer Discord
   `#x402` channel pointing at the PR so it gets eyes.

## After it merges

x402.direct should pick up the listing within 30 minutes – 6 hours
per their auto-crawl cadence. No further action.
