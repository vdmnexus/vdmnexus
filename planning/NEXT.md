# Tomorrow's plan — 2026-06-29

Roadmap order from `CLAUDE.md` governs. Speed-to-distribution beats feature work.

## 1. x402 discovery listings (roadmap item 2)

Prompt: `prompts/02-discovery-listings.md`

Submit/list Nexus on: Bazaar (CDP), Agentic.Market, x402.direct, awesome-x402.
Zero code, zero cost, max distribution. The indexes are where every new x402 dev
lands first. Start here.

## 2. ERC-8004 agent card (roadmap item 3)

Prompt: `prompts/03-erc-8004-card.md`

Publish an ERC-8004 agent card on Ethereum mainnet pointing at `/chat/completions`,
declaring Ed25519 verification + SIR v2 receipt format. ERC-8004 went live 29 Jan 2026
(Coinbase / MetaMask / Ethereum Foundation / Google co-authors).

## 3. (stretch) Coinbase AgentKit provider (roadmap item 4)

Prompt: `prompts/04-agentkit-pr.md`

PR against `coinbase/cdp-agentkit` adding a Nexus action provider. Highest-visibility
OSS contribution available. Only tackle if items 1 and 2 are done first.

## Context for next session

- Python SDK (item 1): SHIPPED — `vdm-nexus@0.2.2` on PyPI, `langchain-vdm-nexus@0.1.0`
- Mastra + Vercel AI SDK providers (item 5): SHIPPED — `mastra-provider@0.1.0`, `ai-sdk-provider@0.1.0`
- Open PR#118 (homepage fixes) is ready to merge — CI check first, then merge before
  starting item 1 if it is still open.
- Open PR#114 (WC site) and PR#106 (cards spec) and PR#95 (Polymarket) remain blocked
  on Dennis input; do not touch.
