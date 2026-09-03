# Tomorrow's plan — 2026-09-04

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus the three open process/financial decisions, listed first — they now
gate everything else in this list.

0. **Three open decisions, unanswered in `#nexus` with zero human reply
   in the channel's entire history.** Repeat plainly, no further
   escalation in wording:
   - **Vercel plan-vs-cron-cadence for `nexus`** — open since 2026-08-21
     (13 days). `vdm-nexus` is on the Hobby plan; Hobby rejects
     `apps/nexus/vercel.json`'s `*/2 * * * *` deposit-scan cron on any new
     build. Upgrade to Pro, or drop the cron to once-daily — either
     unblocks the sixteen-PR planning backlog (#175-#190).
   - **Auto-merge for planning-only PRs** — open since 2026-08-09
     (25 days), now the direct cause of the backlog's size.
   - **Deposit-crediting failure (financial stakes)** — open since
     2026-08-21 (13 days). Production logs show the surviving deposit-scan
     cron hitting Solana `getTransaction` HTTP 429 on every run,
     `credited: 0` every time. On-chain USDC deposits are very likely not
     being credited to agent balances right now.
1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14/T-48h/T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue — 36
   nights unpicked (from the 2026-07-30 re-venue date). Not a pure copy
   substitution: the three-separate-Squads-multisig step and the
   Bubblemaps-Solana clustering check need an explicit Safe-multisig /
   Robinhood-explorer-equivalent decision first. Building blocks already
   merged and ready to reuse: #156 (wallet connect, wagmi/viem), #160
   (`/live` reading real chain state), #162 (trustless vault enumeration).
2. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built, 26
   passing tests; M1 (vault + policy engine) in development. M2-M5 not
   started. 35 days stale. Continue asking Dennis directly for a fresh
   update; never advance a milestone without an explicit report.
3. **Health checks — still egress-blocked, 36th consecutive confirmed
   night** (`WebFetch` returns `EGRESS_BLOCKED` on `nexus.vdmnexus.com`
   and `verify.vdmnexus.com`). Needs Dennis's decision: allowlist these
   hosts for the scheduled session's egress policy, or move health checks
   to a job with broader access. Report as "not run," not pass/fail,
   until resolved.
4. **Standing blocked items**: #106 (cards-v1 spec, `clean`) — still a
   merge-or-close decision, 102 days open. #95 (Polymarket agent,
   `dirty` — merge conflict against `main`) — still blocked on Spanish
   counsel, 103 days open. Legal memo — still status-tracking: email
   drafted, awaiting Dennis's send. May manual-submission backlog — one
   line, no more.

## Process watch

Planning-PR backlog is now sixteen deep (#175 through #190), all blocked
on the same `Vercel – nexus: failure` check, unchanged since
2026-08-18T20:13Z (17 consecutive nights). If the Vercel check clears
before the next session, merge the backlog in strict order rather than
starting fresh. The deposit-scan cron's RPC 429s are a separate, live
financial-stakes issue — 13 days running. Given 25+ days of Slack silence
on live financial stakes, tonight's session also pushed a direct
notification outside `#nexus`.
