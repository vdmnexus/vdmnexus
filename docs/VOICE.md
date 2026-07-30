# Copy voice

Rules for every piece of user-facing copy on vdmnexus.com and in the docs.
Enforced (partially) by `scripts/copy-lint.mjs`, which runs in CI.

## Show the thing

Prefer artifacts over adjectives. A real receipt JSON beats "cryptographically
secure". A curl command beats "easy to integrate". A live number with a date
("mainnet live since 2026-05-21") beats "battle-tested". A contract address
beats "on-chain transparent".

If a sentence would survive on any competitor's site unchanged, it says
nothing. Cut it or replace it with evidence.

## Banned

- Rule-of-three adjective/noun triads ("fast, secure, and reliable")
- "isn't just X — it's Y"
- "welcome to the future", "say goodbye to"
- seamless, effortless, unlock (marketing sense), empower, supercharge,
  robust, cutting-edge, revolutionize, game-changing
- "Get Started Today"-style CTAs. Prefer CTAs that name the artifact:
  "read the spec", "run the smoke test", "try a live mainnet call"

Technical usages are fine: vesting "unlocks", a v4 PoolManager `unlock` call.
The lint whitelists those; don't contort real terminology to dodge it.

## Rhythm

Vary sentence length. Fragments allowed. No section-ending punchlines.
Not every card grid needs exactly three perfectly parallel cards — if the
fourth point is real, add it; if the third is filler, cut it.

## State limitations plainly

"Losses get bounded, not prevented." "Unaudited until M5." "No SLA, no
external audit yet." Constraints read as honesty and they age better than
hedged marketing. If a claim depends on something unshipped, date it or
gate it — never imply it's live.

## Before / after

Bad: "VDM Nexus isn't just an inference API — it's a seamless trust layer
that empowers your agents."
Good: "Every inference call returns a signed receipt. Verify it yourself:
five checks, one function call."

Bad: "Fast, secure, and reliable payments unlock the agent economy."
Good: "Per-call USDC settlement. ~$0.01 plus the receipt fee. Solana and
Base mainnet."

Bad: "Get started today and experience effortless integration!"
Good: "Run the quickstart. First signed call in under five minutes."
