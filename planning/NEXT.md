# Tomorrow's plan — 2026-08-05

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.

1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   sixth night running as the top actionable item with no PR picking
   it up. Not a pure copy-substitution: the three-separate-Squads-
   multisig step and the Bubblemaps-Solana clustering check need an
   explicit Safe-multisig / Robinhood-explorer-equivalent decision
   first, not just a renamed tool. Note for whoever picks this up:
   2026-08-04's site rebrand (#156) landed real Robinhood Chain wallet
   plumbing (chain IDs 46630 testnet / 4663 mainnet, connector setup) —
   worth checking whether that unblocks any of the operational rewrite
   before starting from scratch.
2. **Rienda M1-M5**: last reported status unchanged (2026-07-31, from
   Dennis) — spec complete; token + Uniswap v4 fee-burn hook contracts
   built, 26 passing tests; M1 (vault + policy engine) in development.
   M2-M5 not started. Not stale — ask for an update only if this goes
   past 2026-08-07 without a fresh report.
3. **Health checks — still an infra blocker, fifth night running.**
   This session's outbound proxy rejects `www.vdmnexus.com`,
   `verify.vdmnexus.com`, and `nexus.vdmnexus.com` with a policy `403`
   — confirmed again tonight via WebFetch, identical to the prior four
   nights. Needs Dennis's decision: allowlist these three hosts for
   the scheduled session's egress policy, or move health checks to a
   job that has broader access. Until resolved, keep reporting the
   health-check line as "not run," not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (72+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel. Legal memo —
   still status-tracking: email drafted, awaiting Dennis send. May
   manual-submission backlog — one line, no more. #114 (WC26 site) —
   dropped from tracking; confirmed closed 2026-07-31, was carried
   forward as "open" in error for three nights.

## Process watch

Found #155 (2026-08-03's own daily-review PR) still genuinely unmerged
at the start of tonight's session — merged it before gathering, per
standard practice. Last night's session had concluded the #142/#152
stuck-PR pattern was just a display quirk in the PR-list endpoint; #155
shows that conclusion was wrong, at least for #155 itself. Keep checking
for a prior unmerged daily-review PR at the top of step 1 every night,
and trust `pull_request_read` (single-PR `get`) or `git log main` over
the list endpoint's `merged` field when judging whether one landed.
