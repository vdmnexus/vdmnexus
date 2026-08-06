# Tomorrow's plan — 2026-08-06

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.

1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   seventh night running as the top actionable item with no PR picking
   it up. Not a pure copy-substitution: the three-separate-Squads-
   multisig step and the Bubblemaps-Solana clustering check need an
   explicit Safe-multisig / Robinhood-explorer-equivalent decision
   first, not just a renamed tool. #156 (2026-08-04, rebrand) and #160
   (2026-08-05, `/live` page) both landed real Robinhood Chain wallet
   plumbing (wagmi/viem, chain IDs 46630 testnet / 4663 mainnet,
   on-chain reads) — worth reusing before starting the rewrite from
   scratch.
2. **Rienda M1-M5**: last reported status unchanged (2026-07-31, from
   Dennis) — spec complete; token + Uniswap v4 fee-burn hook contracts
   built, 26 passing tests; M1 (vault + policy engine) in development.
   M2-M5 not started. Not stale — ask for an update only if this goes
   past 2026-08-07 without a fresh report.
3. **Health checks — still an infra blocker, sixth night running.**
   This session's outbound proxy rejects `www.vdmnexus.com`,
   `verify.vdmnexus.com`, and `nexus.vdmnexus.com` with a policy `403`
   — confirmed again tonight via WebFetch, identical to the prior five
   nights. Needs Dennis's decision: allowlist these three hosts for
   the scheduled session's egress policy, or move health checks to a
   job that has broader access. Until resolved, keep reporting the
   health-check line as "not run," not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (73+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel. Legal memo —
   still status-tracking: email drafted, awaiting Dennis send. May
   manual-submission backlog — one line, no more. **New:** #160
   (`/live` page, opened 2026-08-05) is CI-green and ready — needs
   Dennis to add 6 env vars in Vercel, then merge.

## Process watch

Checked for a prior unmerged daily-review PR at the start of tonight's
session, per standing practice: #159 (2026-08-04's review) was already
merged — no stuck PR this time. Keep checking every night regardless;
the #142/#152/#155 pattern was intermittent, not resolved.
