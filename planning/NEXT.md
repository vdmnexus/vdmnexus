# Tomorrow's plan — retargeted 2026-07-31

Hand-edited (per `planning/README.md`, corrections only) as part of the
loop retarget in `prompts/00-daily-review.md`: the nightly plan now
tracks (1) launch readiness, (2) Rienda M1-M5 status, (3) site/API
health, (4) Dennis-blocked standing items — in that order. The old
May distribution backlog no longer drives the plan.

1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun, Squads, Solscan) and need a rewrite pass for the
   Uniswap v4 / Robinhood Chain venue before any date can be set —
   that rewrite is the next actionable checklist item. /disclosures,
   /security, and the token-page rewrite merged in #149/#150; verify
   which checklist boxes that actually closes and log it.
2. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built,
   26 passing tests; M1 (vault + policy engine) in development.
   M2-M5 not started. Ask for an M1 update only if this goes stale
   past 7 days.
3. **Health checks**: run the three read-only checks (playground
   inference JSON, verify.vdmnexus.com, nexus /api/health) and report
   pass/fail. Note: the playground upstream_error root cause was fixed
   in #150; a follow-up branch is replacing a dead OpenRouter model
   slug — re-check after it merges.
4. **Standing blocked items**: #114 — decision request: close it? (#150
   removed the wc26 pages from the site). #106 — merge or close. #95 —
   Spanish counsel. Legal memo — status: email drafted, awaiting
   Dennis send. May manual-submission backlog — one line, no more.
