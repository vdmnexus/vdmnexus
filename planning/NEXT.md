# Tomorrow's plan — 2026-09-05

Tracked objects, in priority order (per `prompts/00-daily-review.md`).
Process-integrity items listed first — they are now blocking everything
else in this loop.

0. **Process integrity — three unanswered decisions, one with real
   financial stakes.** Zero human replies anywhere in `#nexus`'s
   history. As of tonight (2026-09-04):
   - **Vercel plan-vs-cron-cadence for `nexus`**, open since 2026-08-21
     (14 days). The `nexus` Vercel project has not built since
     2026-08-18T20:13Z because the Hobby-plan cron-frequency limit
     rejects `apps/nexus/vercel.json`'s `*/2 * * * *` deposit-scan cron.
     Upgrading `vdm-nexus` to Pro, or dropping that cron to once-daily,
     either one unblocks the planning-PR backlog.
   - **auto-merge for planning-only PRs**, open since 2026-08-09
     (26 days) — now the direct cause of the backlog's size (17 PRs:
     #175 through tonight's, none merged).
   - **Deposit-crediting failure — financial stakes.** Open since
     2026-08-21 (14 days). Every `/api/v1/deposits/scan` run still
     completes with `credited: 0`; Solana RPC `getTransaction` calls
     are hitting HTTP 429 on the same stuck transactions. On-chain
     USDC deposits are very likely not being credited to agent
     balances right now.
   Repeat all three plainly; no further escalation in wording until one
   gets an answer. If the Vercel check clears before the next session,
   merge the backlog in strict order (#175 → ... → tonight's PR) rather
   than starting fresh.
1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   and need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   38th night running as the top actionable item with no PR picking it
   up. Building blocks #156, #160, #162 remain ready to reuse.
2. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built, 26
   passing tests; M1 (vault + policy engine) in development. M2-M5 not
   started. Now 36 days stale as of 2026-09-05 — continue asking Dennis
   directly for a fresh update. Carry forward unchanged until one lands.
3. **Health checks — still an infra blocker, 37th consecutive confirmed
   night.** This session's outbound proxy rejects `nexus.vdmnexus.com`
   and `verify.vdmnexus.com` with `EGRESS_BLOCKED`. Needs Dennis's
   decision: allowlist these hosts for the scheduled session's egress
   policy, or move health checks to a job that has broader access.
   Until resolved, keep reporting the health-check line as "not run,"
   not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (103+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 104+ days,
   now `mergeable_state: dirty`. Legal memo — still status-tracking:
   email drafted, awaiting Dennis send. May manual-submission backlog —
   one line, no more.

## Process watch

Tonight (2026-09-04) re-verified all three open decisions fresh rather
than carrying them forward: Vercel plan-vs-cron-cadence (14 days),
auto-merge-for-planning-PRs (26 days), and the deposit-crediting RPC
429s (14 days, financial stakes). Sent tonight's summary through the
scheduled-task notification channel directly, in addition to the
`#nexus` post, given the combination of process breakdown and an
unaddressed live financial-impact bug.
