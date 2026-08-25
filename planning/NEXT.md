# Tomorrow's plan — 2026-08-26

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked
items. Plus the process-integrity item, listed first.

0. **Process integrity — two open decisions, both a full week
   unanswered, now flagged for direct attention.** (a) Vercel
   plan-vs-cron-cadence for `nexus` — the `Vercel – nexus` check has
   failed pre-build on every planning PR since 2026-08-18T20:13Z
   (Hobby-plan cron-frequency limit rejecting the `*/2 * * * *`
   deposit-scan cron in `apps/nexus/vercel.json`). Re-verified
   individually across all six open PRs (#175–#180) again tonight —
   unchanged. Needs Dennis's call: upgrade `vdm-nexus` to Vercel Pro,
   or drop the cron cadence to once-daily. (b) Auto-merge for
   docs-only `planning/**` + `STATUS.md` PRs — open since 2026-08-09
   (16+ days). If the Vercel check clears before the next session,
   merge the backlog in order (#175 → #176 → #177 → #178 → #179 →
   #180 → #181) rather than starting fresh.
1. **Deposit-scan cron crediting 0 deposits per run (Solana RPC
   429s)** — found 2026-08-21, unaddressed 4+ days as of tonight.
   Independent of the Vercel plan question. On-chain USDC deposits are
   very likely not being credited right now. Needs a look at
   `SOLANA_RPC_URL` capacity/rate limits — not fixable from this
   read-only loop, but the one item in the backlog with direct
   financial stakes.
2. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   29th night running as the top actionable item with no PR picking it
   up. Not a pure copy-substitution: the three-separate-Squads-
   multisig step and the Bubblemaps-Solana clustering check need an
   explicit Safe-multisig / Robinhood-explorer-equivalent decision
   first. Building blocks merged and ready: #156 (wallet connect), #160
   (`/live` chain reads), #162 (trustless vault enumeration).
3. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built, 26
   passing tests; M1 (vault + policy engine) in development. M2-M5 not
   started. Now 25 days stale — continue asking Dennis directly for a
   fresh update. Carry forward unchanged until one lands.
4. **Health checks — still an infra blocker, at least 27 consecutive
   confirmed nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   with a CONNECT-tunnel 403 — confirmed again tonight via curl
   (`curl: (56) CONNECT tunnel failed, response 403` on all three
   hosts), identical to every prior confirmed night since 2026-07-31.
   Needs Dennis's decision: allowlist these three hosts for the
   scheduled session's egress policy, or move health checks to a job
   that has broader access. Until resolved, keep reporting the
   health-check line as "not run," not pass/fail.
5. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (93+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 94+ days.
   Legal memo — still status-tracking: email drafted, awaiting Dennis
   send. May manual-submission backlog — one line, no more.

## Process watch

Tonight (2026-08-25) re-verified all six open planning PRs
(#175–#180) individually — all still CI-red on the same diagnosed
Vercel Hobby-plan cron-limit issue, unchanged since 2026-08-18. Not
merging any of them or tonight's PR (#181 once opened). Backlog is
now seven deep. Both the Vercel plan/cron decision and the auto-merge
ask have gone a full week with zero replies in `#nexus`; this session
is escalating both, plus the deposit-crediting RPC-429 finding,
outside the routine Slack summary given the financial stakes and the
week of silence.
