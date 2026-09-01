# Tomorrow's plan — 2026-09-02

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked
items. Plus the process-integrity items, listed first.

1. **Process integrity — Vercel plan-vs-cron-cadence for `nexus`.**
   Fifteen consecutive nights (since 2026-08-18T20:13Z) of a diagnosed,
   unchanged failure: `vdm-nexus` remains on the Hobby plan, which
   rejects the `*/2 * * * *` deposit-scan cron in
   `apps/nexus/vercel.json` on any new deploy. Re-verified fresh
   tonight via `list_teams` (still `hobby`) and PR #187's combined
   status (still `Vercel – nexus: failure`). This directly blocks
   every planning PR from merging. Backlog is now fourteen deep
   (#175-#187, plus tonight's PR). Needs Dennis to either upgrade
   `vdm-nexus` to Pro or drop the cron to once-daily. If the check
   clears before the next session, merge the backlog in order
   (#175 → ... → #187 → tonight's PR) rather than starting fresh.
2. **Financial stakes — deposit-scan cron crediting 0 deposits per
   run.** Reconfirmed directly against live production runtime logs
   tonight: every run of `/api/v1/deposits/scan` (still firing on the
   last pre-block production deploy, every ~2 minutes) logs `RPC
   getTransaction HTTP 429` on the same three transaction signatures
   and completes with `credited:0`. On-chain USDC deposits sent to the
   Nexus deposit address in this window very likely have not been
   credited to agent balances. 11 days running since first found
   (2026-08-21). Needs a look at `SOLANA_RPC_URL` capacity/rate
   limits, independent of the Vercel plan question.
3. **Auto-merge-for-planning-PRs ask.** Open since 2026-08-09, 23
   days, now directly responsible for the fourteen-PR backlog size.
   Keep repeating plainly.
4. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   39th night running as the top actionable build item with no PR
   picking it up. Still needs an explicit Safe-multisig /
   Robinhood-explorer-equivalent decision for the three-multisig and
   clustering-check steps before the rewrite itself starts. Building
   blocks merged and ready: #156 (wallet connect), #160 (`/live` chain
   reads), #162 (factory enumeration).
5. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built, 26
   passing tests; M1 (vault + policy engine) in development. M2-M5 not
   started. Now 32 days stale — continue asking Dennis directly for a
   fresh update. Carry forward unchanged until one lands.
6. **Health checks — still an infra blocker, 33 consecutive confirmed
   nights.** This session's outbound proxy rejects
   `nexus.vdmnexus.com` and `verify.vdmnexus.com` with an explicit
   `EGRESS_BLOCKED` error, confirmed again tonight via `WebFetch`.
   Needs Dennis's decision: allowlist these hosts for the scheduled
   session's egress policy, or move health checks to a job that has
   broader access. Until resolved, keep reporting the health-check
   line as "not run," not pass/fail.
7. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (100 days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 101 days.
   Legal memo — still status-tracking: email drafted, awaiting Dennis
   send. May manual-submission backlog — one line, no more.

## Process watch

Tonight (2026-09-01) re-verified both the Vercel blocker and the
deposit-crediting failure fresh rather than carrying them forward —
both unchanged, both now with real duration (15 nights / 11 days).
Given zero human replies anywhere in `#nexus`'s history and a possible
delivery gap on the last two nights' "direct notification" attempts,
this session escalated through the scheduled-task notification channel
directly. Keep tracking both blockers nightly until either resolves.
