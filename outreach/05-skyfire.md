# Skyfire — Amir Sarhangi & Craig DeWitt (KYAPay)

**Why:** Partner, not compete. Skyfire has signed-JWT agent identity (KYA) and a $9.5M funding base (Neuberger Berman / a16z CSX / Coinbase Ventures, F5 partnership Mar 2026). Nexus has Ed25519 + per-call receipts. An interop bridge — JWT-identity-agent calls a Nexus endpoint, Nexus reads the JWT, settles in x402, returns a SIR v2 receipt that references the JWT subject — is a real product for both sides.

**Channels:**
- LinkedIn DM (Amir is more active there than Craig)
- Cold email to founder@skyfire.xyz or similar (verify the address before sending)

**Send only after:** the AgentKit PR is in the queue and there's a public signal Skyfire's leadership has seen (e.g. Amir likes / replies to an x402-adjacent tweet).

---

## Template — LinkedIn DM to Amir

```
Hey Amir — Dennis from VDM Nexus.

Cold reach, hopefully useful. We're shipping signed-inference receipts
on top of x402 (Solana + Base mainnet). Agent identity is Ed25519
on-chain; receipts bind model output to settlement. Mainnet went live
this week:

vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e

Where I see overlap (not competition): KYA is OAuth/JWT-based and
solves the "who is this agent" problem at the identity layer. We
solve the "what did this agent ask, and what came back, and was it
paid for" problem at the inference layer. Those compose. A Skyfire
agent that pays a Nexus endpoint and gets a receipt back gets a full
end-to-end provable chain: identity → payment → inference output.

I'd value 15 minutes to explore whether there's an interop spec worth
co-publishing. Something like: Skyfire JWT subject embedded in the
SIR v2 receipt's optional `payer_identity` field, so a SIR v2 verifier
can independently check both the on-chain payment and the KYA-attested
identity of the payer.

If you'd rather punt to Craig or another engineer that's fine — happy
to start there.

Source (MIT): github.com/vdmnexus/vdmnexus
Receipt format spec: docs.vdmnexus.com/spec/sir-v2
```

## Template — short version (if word-count matters)

```
Hey Amir — Dennis from VDM Nexus, signed-inference rail (Ed25519,
per-call USDC on Solana / Base). Mainnet live, first receipt:
vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e

Wondering if there's an interop spec worth co-publishing — KYA JWT
embedded in a SIR v2 receipt's optional payer_identity field would
give Skyfire agents a full identity → payment → inference output
provable chain. 15 min when convenient?
```

## After he responds

- If "interesting, let's talk" → propose the spec idea concretely. Have a one-page sketch ready (in `outreach/skyfire-interop-sketch.md` if useful — write it before the call).
- If "we're going a different direction" → thank, ask "anyone on the team you'd point me to who's thinking about identity-to-payment composability?" — same conversation, different door.
- If silence after 14 days → drop it. Don't double-DM. Try again in 2-3 months if there's a fresh hook.

## Don't say

- Anything that frames KYA as inferior or competitive (you're proposing partnership, not a sales pitch)
- "We could partner on a token launch" (Skyfire is VC-backed; their cap table won't entertain co-tokens)
- Promises about regulatory positioning (you don't yet have the Spanish MiCA memo; don't claim what you can't back)

## Strategic note

Skyfire is the closest competitor on the "agent identity + payments" surface. Treating them as a partner now is much cheaper than treating them as a competitor in 12 months. The interop spec idea is genuine; both sides benefit; if it lands as a published thing, you both gain credibility from the existence of the other.

If the conversation goes well and they propose deeper collaboration, default to public-spec-first / proprietary-integration-second. Anything in their stack you depend on becomes leverage they have over you later.
