# Tomorrow's plan — 2026-08-04

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.

1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   fifth night running as the top actionable item with no PR picking
   it up. Not a pure copy-substitution: the three-separate-Squads-
   multisig step and the Bubblemaps-Solana clustering check need an
   explicit Safe-multisig / Robinhood-explorer-equivalent decision
   first, not just a renamed tool. Worth flagging to Dennis directly
   if a sixth night passes with no owner assigned.
2. **Rienda M1-M5**: last reported status unchanged (2026-07-31, from
   Dennis) — spec complete; token + Uniswap v4 fee-burn hook contracts
   built, 26 passing tests; M1 (vault + policy engine) in development.
   M2-M5 not started. Not stale — ask for an update only if this goes
   past 2026-08-07 without a fresh report.
3. **Health checks — still an infra blocker, fourth night running.**
   This session's outbound proxy rejects the CONNECT to
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and
   `nexus.vdmnexus.com` with a policy `403` — confirmed again tonight,
   identical to the prior three nights. Needs Dennis's decision:
   allowlist these three hosts for the scheduled session's egress
   policy, or move health checks to a job that has broader access.
   Until resolved, keep reporting the health-check line as "not run,"
   not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24. #95 (Polymarket) — still
   blocked on Spanish counsel. Legal memo — still status-tracking:
   email drafted, awaiting Dennis send. May manual-submission backlog
   — one line, no more.

## Process watch

`git log main` shows #154 (2026-08-02's review) merged cleanly via a
real merge commit. Note for future runs: the `list_pull_requests` /
`search_pull_requests` GitHub tools have been reporting `merged: false`
on every closed daily-review PR for weeks, even ones confirmed merged
in the commit graph — trust `git log` / `pull_request_read` (`get`)
over the list/search `merged` field when checking for a stuck PR.
