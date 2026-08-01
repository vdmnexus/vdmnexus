# Tomorrow's plan — 2026-08-02

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.

1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   third night running as the top actionable item with no PR picking
   it up. Not a pure copy-substitution: the three-separate-Squads-
   multisig step and the Bubblemaps-Solana clustering check need an
   explicit Safe-multisig / Robinhood-explorer-equivalent decision
   first, not just a renamed tool.
2. **Rienda M1-M5**: last reported status unchanged (2026-07-31, from
   Dennis) — spec complete; token + Uniswap v4 fee-burn hook contracts
   built, 26 passing tests; M1 (vault + policy engine) in development.
   M2-M5 not started. Not stale — ask for an update only if this goes
   past 2026-08-07 without a fresh report.
3. **Health checks — still an infra blocker, second night running.**
   This session's outbound proxy rejects the CONNECT to
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and
   `nexus.vdmnexus.com` with a policy `403` — confirmed again tonight,
   identical to 2026-07-31. Needs Dennis's decision: allowlist these
   three hosts for the scheduled session's egress policy, or move
   health checks to a job that has broader access. Until resolved,
   keep reporting the health-check line as "not run," not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24. #95 (Polymarket) — still
   blocked on Spanish counsel. Legal memo — still status-tracking:
   email drafted, awaiting Dennis send. May manual-submission backlog
   — one line, no more.

## Process watch

Second stuck-unmerged planning PR in ~2 weeks (#142 on 07-24→25, #152
on 07-31→08-01) despite green CI and clean mergeable state both times.
Tonight's run recovered it by verifying and merging before starting
the gather step — keep doing that as standard practice at the top of
step 1 (check for a prior unmerged daily-review PR before assuming the
last `planning/daily/*.md` file reflects `main`).
