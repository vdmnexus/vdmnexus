# Shaw — ElizaOS founder

**Why:** Gatekeeper for ElizaOS plugin legitimacy. ElizaOS is the largest crypto-native TypeScript agent community. A retweet or a "this is the canonical x402 plugin" from him changes everything for ElizaOS-based agents.

**Channels:**
- X DM (he's active there)
- ElizaOS Discord #plugin-dev (post the plugin PR, tag him)

**Send only after:** the ElizaOS plugin is in PR against `elizaos-plugins/registry`. Shipping first, then asking — this is the rule for Shaw specifically.

---

## Template — opening DM (after plugin PR is open)

```
Hey Shaw — Dennis from VDM Nexus.

Shipped a plugin into the ElizaOS registry — signed inference, agents
pay per call in USDC on Solana mainnet, every response carries a
cryptographic receipt the model can't repudiate. PR: <URL>

Why I think this matters for ElizaOS specifically: your agents already
have keypairs, they already trade and tx on-chain. Adding a Nexus
receipt to every inference means an ElizaOS agent that bills users
downstream can prove what it asked the model and what came back.
Differentiator vs any other agent framework today.

Mainnet went live this week. First paid call with a verifiable
receipt: vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e

Specific ask: when the plugin gets reviewed, mind being the one who
takes a look? Happy to walk you through the signing / receipt
semantics in 10 minutes if useful. No timeline pressure — your team's
process is your team's process.
```

## After he responds

- If "looks cool, will review" → thank him, link the npm package, drop it. Don't ask for a retweet directly — let him decide.
- If "let's chat" → 15 min, Telegram, walk through the playground in real time. The playground (vdmnexus.com/playground) demos the whole flow in 30 seconds.
- If he asks about token / pricing / business model → straight answer: "OpenRouter cost passed through 1:1 at the protocol layer. No markup yet. Token is a phase 2 thing, after distribution proves out usage. I'm leaning Solana, fair launch, utility-tied."

## What to bring to a call with Shaw

- A live `/playground` demo (you can paste your laptop screen)
- The first mainnet receipt link
- A short "what ElizaOS agents could do with receipts that they can't today" — be specific, not abstract. Example: "An ElizaOS trading agent that prints its inference receipts publicly creates an auditable track record other agents can verify before delegating."

## Don't say

- Anything that sounds like "we want to be the default LLM for ElizaOS"
- Anything dismissive of OpenRouter / other providers (his audience uses them)
- Promises about timing of features that aren't built
