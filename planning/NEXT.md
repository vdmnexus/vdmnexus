# Tomorrow's plan — 2026-08-15

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus a new process-integrity item found tonight, listed first.

0. **Process integrity — verify before trusting Slack.** A "Daily
   review 2026-08-13" summary was posted to `#nexus` on 2026-08-13 but
   no corresponding commit, file, or PR ever landed in the repo —
   `main` skipped straight from #169 (2026-08-12) to whatever this
   session opens. Ask Dennis if he noticed; recommend every future
   nightly session re-fetch `main` after pushing and confirm the merge
   actually landed before posting a Slack summary that claims success.
1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   seventeenth night running as the top actionable item with no PR
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
   started. Now 14 days stale as of 2026-08-14 — asked Dennis directly
   for a fresh update in tonight's Slack summary. Carry forward
   unchanged until one lands.
3. **Health checks — still an infra blocker, at least 15 consecutive
   confirmed nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   with an explicit `EGRESS_BLOCKED` policy denial — confirmed again
   tonight via both `curl` and `WebFetch`, identical to every prior
   night since 2026-07-31. Needs Dennis's decision: allowlist these
   three hosts for the scheduled session's egress policy, or move
   health checks to a job that has broader access. Until resolved,
   keep reporting the health-check line as "not run," not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (82+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 83+ days.
   Legal memo — still status-tracking: email drafted, awaiting Dennis
   send. May manual-submission backlog — one line, no more.

## Process watch

New tonight: see item 0 above. Separately, the earlier
green-CI-but-unmerged planning-PR pattern (#142, #152, #155, #163,
#165, #166) had looked resolved after three clean nights (#164, #167,
#168) plus #169's clean merge — that pattern is unrelated to tonight's
finding (no PR ever existed for 2026-08-13, vs. a PR existing but not
merging) and should be tracked separately if it recurs.
