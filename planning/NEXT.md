# Tomorrow's plan — 2026-08-30

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus the process-integrity item, listed first.

0. **Process integrity — three unanswered decisions, now with a month
   of combined silence.** Tonight (2026-08-29) re-verified the backlog
   individually (checked #175 and #184 directly): both still
   `Vercel – nexus: failure`, `mergeable_state: unstable` (no merge
   conflict, purely the failing check) — the diagnosed Hobby-plan
   cron-frequency limit rejecting `apps/nexus/vercel.json`'s
   `*/2 * * * *` deposit-scan cron, unchanged since 2026-08-18T20:13Z.
   12th consecutive night of genuine CI-red. Not merging #175-#184 or
   tonight's PR. Backlog is now **eleven** deep (#175-#185). Three
   decisions remain open in `#nexus`, a channel with zero human replies
   in 62 days: (a) Vercel plan-vs-cron-cadence for `nexus`, since
   2026-08-21 (8 days); (b) auto-merge-for-planning-PRs, since
   2026-08-09 (20 days) — now directly responsible for the eleven-PR
   backlog; (c) **financial-stakes: the deposit-scan cron is crediting
   0 deposits per run (Solana RPC 429s) — on-chain USDC deposits are
   very likely not being credited**, found 2026-08-21, unaddressed 8
   days. Sent a direct notification tonight given the stakes and total
   silence. If the Vercel check clears before the next session, merge
   the backlog in order (#175 → #176 → #177 → #178 → #179 → #180 →
   #181 → #182 → #183 → #184 → #185) rather than starting fresh.
1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   35th night running as the top actionable item with no PR picking it
   up. Not a pure copy-substitution: the three-separate-Squads-multisig
   step and the Bubblemaps-Solana clustering check need an explicit
   Safe-multisig / Robinhood-explorer-equivalent decision first, not
   just a renamed tool. Three real building blocks are merged and
   ready to reuse: #156 (wallet connect, wagmi/viem, chain IDs 46630
   testnet / 4663 mainnet), #160 (`/live` reading real chain state),
   and #162 (trustless vault enumeration from factory storage, no env
   pins).
2. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built, 26
   passing tests; M1 (vault + policy engine) in development. M2-M5 not
   started. Now 29 days stale as of 2026-08-29 — continue asking
   Dennis directly for a fresh update. Carry forward unchanged until
   one lands.
3. **Health checks — still an infra blocker, at least 30 consecutive
   confirmed nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   before reaching the app layer — confirmed again tonight via curl,
   identical to every prior confirmed night since 2026-07-31. Needs
   Dennis's decision: allowlist these three hosts for the scheduled
   session's egress policy, or move health checks to a job that has
   broader access. Until resolved, keep reporting the health-check
   line as "not run," not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (97+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 98+ days,
   now `mergeable_state: dirty`. Legal memo — still status-tracking:
   email drafted, awaiting Dennis send. May manual-submission backlog
   — one line, no more.

## Process watch

Tonight (2026-08-29) re-verified the ten-deep backlog individually —
still genuine CI-red, 12th consecutive night, unchanged root cause.
Eleventh PR (tonight's) joins the backlog. All three open decisions
(Vercel plan/cron, auto-merge, deposit-scan financial bug) remain
unanswered; sent a direct notification given the combined duration and
financial stakes. Keep tracking backlog depth and day-counts in
`STATUS.md` until Dennis responds to any of the three.
