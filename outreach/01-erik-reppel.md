# Erik Reppel — Coinbase / ERC-8004 / AgentKit

**Why:** Co-authored ERC-8004 (Ethereum mainnet, 29 Jan 2026). Architect on Coinbase AgentKit. Single most important contact in the x402 / agent-payments space.

**Channels:**
- X DM (verify current handle before sending)
- LinkedIn DM
- Best of all: the `coinbase/cdp-agentkit` PR thread (let the PR be the introduction)

**Send only after:** the AgentKit PR (`prompts/04-agentkit-pr.md`) is open. The PR is the warm context.

---

## Template — opening DM

```
Hey Erik — Dennis from VDM Nexus.

Just opened a PR against cdp-agentkit adding a signed-inference action
provider — receipts that bind the model output to the on-chain
settlement, x402 on Solana + Base, OpenAI-compat /chat/completions
underneath. PR: <URL>

Two reasons I'm reaching out:

(1) Mainnet shipped this week, first paid call settled with a
verifiable receipt — would value your eyes on the protocol even if
the PR sits in review for a while. First receipt:
vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e

(2) We published an ERC-8004 identity card pointing at the same
endpoint — Ed25519 verification, SIR v2 receipt format. Card:
vdmnexus.com/.well-known/agent-card.json

Specific ask: 15 minutes when you have one. Want your read on whether
we're holding the spec right and where the signed-inference primitive
fits inside the AgentKit story.

Source (MIT): github.com/vdmnexus/vdmnexus
```

## Variant — if you have a specific blocker to ask about

Replace the "Specific ask" paragraph with:

```
Specific ask: <one-line concrete question>. E.g.:
  - "Is the action-provider naming convention I used in the PR right,
     or do you prefer a different prefix for third-party submissions?"
  - "How tightly does AgentKit want third-party providers to integrate
     with Agentic Wallets vs run their own keypair, like Nexus does?"
```

A concrete question gets a concrete answer faster than "would love your read."

## After he responds

- If "happy to review the PR" → thank him, don't push for a call yet. Let the review come.
- If "let's get on a call" → propose two specific 15-min windows in his timezone. Don't wait for him to propose.
- If silence after 7 days → one-line bump in the same thread: "no rush — wanted to flag a small update: <X shipped>." Then drop it.

## Don't say

- "Would love your advice"
- "Picking your brain"
- Anything about token launch (that's a later conversation; Coinbase is structurally cautious about token-adjacent overtures)
- Anything Anthropic / Skyfire / Hyperbolic competitive (he's senior at Coinbase; he doesn't need a competitive sales pitch)
