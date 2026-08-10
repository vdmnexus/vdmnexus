# Tomorrow's plan — 2026-08-11

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.

1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   twelfth night running as the top actionable item with no PR picking
   it up. Not a pure copy-substitution: the three-separate-Squads-
   multisig step and the Bubblemaps-Solana clustering check need an
   explicit Safe-multisig / Robinhood-explorer-equivalent decision
   first, not just a renamed tool. Three real building blocks are
   merged and ready to reuse: #156 (wallet connect, wagmi/viem, chain
   IDs 46630 testnet / 4663 mainnet), #160 (`/live` reading real chain
   state), and #162 (trustless vault enumeration from factory storage,
   no env pins).
2. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built, 26
   passing tests; M1 (vault + policy engine) in development. M2-M5 not
   started. Now 10 days stale as of 2026-08-10 — asked Dennis directly
   for a fresh update in tonight's Slack summary for the fourth night
   running. Carry forward unchanged until one lands.
3. **Health checks — still an infra blocker, eleventh night running.**
   This session's outbound proxy rejects `www.vdmnexus.com`,
   `verify.vdmnexus.com`, and `nexus.vdmnexus.com` with a policy block
   — confirmed again tonight, identical to the prior ten nights. Needs
   Dennis's decision: allowlist these three hosts for the scheduled
   session's egress policy, or move health checks to a job that has
   broader access. Until resolved, keep reporting the health-check
   line as "not run," not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (78+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 79+ days.
   Legal memo — still status-tracking: email drafted, awaiting Dennis
   send. May manual-submission backlog — one line, no more.

## Process watch

Sixth stuck-planning-PR recovery in under six weeks tonight (#166,
joining #142, #152, #155, #163, #165) — and the second night running
back to back (#165 → #166), breaking the theory that it was
intermittent. Green CI, clean mergeable state, sat unmerged ~24h
regardless. Recommending Dennis turn on auto-merge (or a
merge-on-green Action) for this loop's own docs-only `planning/` PRs
— manual recovery is close to nightly now, not an exception.
