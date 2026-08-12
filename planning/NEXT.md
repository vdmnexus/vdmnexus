# Tomorrow's plan — 2026-08-13

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.

1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   fifteenth night running as the top actionable item with no PR
   picking it up. Not a pure copy-substitution: the three-separate-
   Squads-multisig step and the Bubblemaps-Solana clustering check
   need an explicit Safe-multisig / Robinhood-explorer-equivalent
   decision first, not just a renamed tool. Three real building blocks
   are merged and ready to reuse: #156 (wallet connect, wagmi/viem,
   chain IDs 46630 testnet / 4663 mainnet), #160 (`/live` reading real
   chain state), and #162 (trustless vault enumeration from factory
   storage, no env pins).
2. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built, 26
   passing tests; M1 (vault + policy engine) in development. M2-M5 not
   started. Now 12 days stale as of 2026-08-12 — asked Dennis directly
   for a fresh update in tonight's Slack summary for the sixth night
   running. Carry forward unchanged until one lands.
3. **Health checks — still an infra blocker, thirteenth night running.**
   This session's outbound proxy rejects `www.vdmnexus.com`,
   `verify.vdmnexus.com`, and `nexus.vdmnexus.com` with a policy block
   — confirmed again tonight, identical to the prior twelve nights.
   Needs Dennis's decision: allowlist these three hosts for the
   scheduled session's egress policy, or move health checks to a job
   that has broader access. Until resolved, keep reporting the
   health-check line as "not run," not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (80+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 81+ days.
   Legal memo — still status-tracking: email drafted, awaiting Dennis
   send. May manual-submission backlog — one line, no more.

## Process watch

#168 (2026-08-11's own review PR) merged cleanly within 5 seconds of
opening — no manual recovery needed, third clean night running (after
#164 and #167) against six stuck recoveries (#142, #152, #155, #163,
#165, #166) in the same window. Three clean nights in a row is
starting to lean toward "resolved" rather than "intermittent" — still
recommending Dennis turn on auto-merge (or a merge-on-green Action)
for this loop's own docs-only `planning/` PRs to settle it either way.
