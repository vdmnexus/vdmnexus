# Tomorrow's plan — 2026-08-01

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.

1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   this is now the second night this is the top actionable item, no
   PR has picked it up yet. Note for whoever picks this up: it's not a
   pure copy-substitution — the three-separate-Squads-multisig step and
   the Bubblemaps-Solana clustering check need an explicit
   Safe-multisig / Robinhood-explorer equivalent decision, not just a
   renamed tool. `/disclosures` and `/security` are now live and
   un-gated (shipped in #149/#150) — that closes real ground on the
   T-14 list even though the checklist file's checkboxes weren't
   touched (out of this loop's scope; logged in tonight's daily file).
2. **Rienda M1-M5**: last reported status unchanged (2026-07-31, from
   Dennis) — spec complete; token + Uniswap v4 fee-burn hook contracts
   built, 26 passing tests; M1 (vault + policy engine) in development.
   M2-M5 not started. Ask for an update only if this goes stale past
   7 days from 2026-07-31.
3. **Health checks — infra blocker, not a site blocker.** Tonight's run
   could not reach `www.vdmnexus.com`, `verify.vdmnexus.com`, or
   `nexus.vdmnexus.com` at all — the session's outbound proxy rejected
   the CONNECT with a policy 403 to all three hosts specifically. This
   needs Dennis: either allowlist these hosts for the scheduled
   session's egress policy, or confirm health checks should move
   elsewhere. Until resolved, treat the health-check line in nightly
   summaries as "not run" rather than pass/fail.
4. **Standing blocked items**: #114 is resolved (closed 2026-07-31,
   stop tracking). #106 (cards-v1 spec) — still a merge-or-close
   decision, open since 2026-05-24. #95 (Polymarket) — still blocked
   on Spanish counsel. Legal memo — still status-tracking: email
   drafted, awaiting Dennis send. May manual-submission backlog — one
   line, no more.
