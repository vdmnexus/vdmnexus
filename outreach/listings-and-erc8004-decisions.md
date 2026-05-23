# Listings + ERC-8004 — two decisions for Dennis

Research came back on the four discovery targets and ERC-8004. Three
things are landing in this PR (the agent card, both well-known paths,
and the upstream `coinbase/x402` ecosystem PR packet). Two need an
explicit call from you before they can move.

## Decision 1 — x402 Bazaar + Agentic.Market: settle through CDP?

**The bind.** CDP indexes Bazaar (and therefore Agentic.Market — same
underlying index) automatically, but only from payments that settled
through the **CDP facilitator**, not from our self-hosted local
facilitator. The other three facilitators (PayAI, XPay, ours) don't
feed the index.

To land on Bazaar we'd need to add a parallel route variant — e.g.
`/api/v1/chat/completions?via=cdp` or a separate `/api/v1/cdp/chat/completions`
endpoint — that settles via CDP. Every paid call through that variant
goes:

```
agent → /chat/completions?via=cdp → CDP facilitator settles USDC →
  CDP routes to our recipient wallet → we run inference → return receipt
```

**Why this matters for MiCA.** CLAUDE.md's red line (§"MiCA red line —
stay a merchant") says: *"The single behaviour that flips Nexus into
MiCA + PSD2 scope is operating its own x402 facilitator that settles
third-party agent→merchant flows."* The CDP-variant doesn't make us a
facilitator — CDP is the third-party settler, not us. So this is
actually **safer** under MiCA than running our own local facilitator
for third parties (which we already don't do).

The merchant relationship stays the same: agent pays USDC for our
inference service. Whether CDP or our local code is the settlement
plumbing in the middle is irrelevant to the merchant question.

**My read:** ship the CDP variant. It's a route alias, not a model
change. Risks:

- **Vendor lock-in for that route.** Calls via `?via=cdp` depend on
  CDP being up. Our local-facilitator route stays unchanged for
  primary traffic.
- **CDP fees.** $0.001 per settled tx after the free 1,000/month tier.
  At our current volume, free tier covers everything.
- **CDP can de-list us.** Coinbase reviews after-the-fact; if the
  agent card or 402 challenge is malformed they can revoke. Low risk
  if we ship the canonical shape.

**Counter-argument for holding off:** Coinbase has a strategic interest
in being the canonical x402 surface. Listing under their Bazaar means
discovery is mediated by them. The independent path
(awesome-x402 + x402.org/ecosystem + x402.direct + our own agent card)
keeps us closer to the protocol than to any one operator.

**Recommendation:** ship the CDP-variant route in a follow-up PR — it
unlocks 80% of the strategic doc's 0.3 + drags Agentic.Market in for
free. Open the question once with you, then if green I'll prep that
PR.

→ **Need from you:** yes / no on shipping a CDP-facilitator route
variant. If yes, I'll open a fresh branch + PR for it.

## Decision 2 — ERC-8004: register on Sepolia now, hold on mainnet

**What's confirmed.** ChaosChain has the reference implementation live
on Ethereum Sepolia (IdentityRegistry: `0xf66e7CBdAE1Cb710fee7732E4e1f173624e137A7`).
The EIP-8004 spec is finalized. Off-chain agent cards work today (the
one we just published is consumable by any 8004-aware indexer).

**What's NOT confirmed.** A canonical Ethereum mainnet registry
contract. The CLAUDE.md "mainnet 29 Jan 2026" line conflates the spec
update date with mainnet deployment. ChaosChain's repo says "Testnet
Ready! Jan 2026 Spec Update deployed to Ethereum Sepolia." No verified
mainnet contract address from the EIP authors as of today.

**Recommendation:**

1. **Today (no action from you needed):** card is live at both well-known
   paths once this PR merges. Any 8004-aware tool can fetch and resolve
   it. This is most of the value.
2. **This week:** mint on Sepolia. Requires an Ethereum wallet with
   Sepolia ETH (~0.001 ETH for the registration tx, free from faucets).
   I can prepare the exact `register(agentURI)` call against
   `0xf66e7CBdAE1Cb710fee7732E4e1f173624e137A7` and you click "send" in
   MetaMask. Card's `registrations[]` array gets the resulting agentId.
3. **Hold:** mainnet mint until either (a) the EIP authors publish a
   canonical mainnet contract address or (b) one of the major
   indexers (Phala, Nuwa, Vistara) does so and points at it. Minting
   on a non-canonical contract is worse than not minting at all —
   it'd require migration later and confuse early indexers.

→ **Need from you:** when you're ready to do the Sepolia mint, ping
me. I'll prep the exact tx payload.

## What's shipping in this PR (no decisions needed)

- `apps/web/app/.well-known/agent-registration.json/route.ts` — EIP-8004
  canonical path.
- `apps/web/app/.well-known/agent-card.json/route.ts` — A2A-protocol
  alias (same payload, same source). Both return the same JSON; both
  CORS-open and cached at the edge.
- Card declares Solana mainnet wallet, both Nexus endpoints
  (`/chat/completions` and `/inference`), the SIR v2 trust model with
  a spec link, and links to docs, playground, verifier, and source.
  Base wallet pulled from `BASE_DEPOSIT_ADDRESS` env when set —
  omitted when unset so we don't advertise a settlement surface we
  can't honor.
- `outreach/x402-ecosystem-pr-packet.md` — ready-to-submit upstream PR
  content for `coinbase/x402` ecosystem page. Includes the entry in
  both Markdown and JSON shapes (whichever matches their canonical
  structure), the PR title + body, and the submission checklist.
  You fork → add → submit; x402.direct auto-crawls within 6 hours.

## What's NOT in this PR

- CDP-facilitator route variant (waiting on Decision 1 above).
- On-chain ERC-8004 registration (waiting on Decision 2 above).
- Agentic.Market curated tier outreach — downstream of Bazaar
  listing, no point starting before Decision 1.
