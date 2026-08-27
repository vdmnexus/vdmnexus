# Tomorrow's plan — 2026-08-28

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus the process-integrity item, listed first.

0. **Process integrity — three open decisions, oldest now 18 days.**
   Tonight (2026-08-27) re-verified PR #175 individually rather than
   trusting carry-forward: `Vercel – nexus` is still `failure`, same
   diagnosed cause (Hobby-plan cron-frequency limit rejecting the
   `*/2 * * * *` deposit-scan cron in `apps/nexus/vercel.json`),
   unchanged since 2026-08-18T20:13Z. Planning-PR backlog is now nine
   deep (#175 → #183). Not merging any of them — genuine CI-red, not
   the old stuck-despite-green pattern. Three distinct decisions sit
   unanswered in `#nexus`, a channel with zero human replies in its
   entire history: (1) Vercel plan-vs-cron-cadence for `nexus`, open
   since 2026-08-21 (6 days) — upgrade to Pro or drop the cron to
   once-daily; (2) auto-merge for docs-only `planning/**` PRs, open
   since 2026-08-09 (18 days); (3) **financial stakes** — the
   deposit-scan cron is crediting 0 deposits per run (Solana RPC
   429s), so on-chain USDC deposits are very likely not being credited
   to agent balances right now, unaddressed since 2026-08-21 (6 days).
   If the Vercel check clears before the next session, merge the
   backlog in order (#175 → #176 → #177 → #178 → #179 → #180 → #181 →
   #182 → #183) rather than starting fresh.
1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   thirty-first night running as the top actionable item with no PR
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
   started. Now 27 days stale as of 2026-08-27 — continue asking
   Dennis directly for a fresh update. Carry forward unchanged until
   one lands.
3. **Health checks — still an infra blocker, at least 28 consecutive
   confirmed nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   with a CONNECT-tunnel 403 — confirmed again tonight via curl,
   identical to every prior confirmed night since 2026-07-31. Needs
   Dennis's decision: allowlist these three hosts for the scheduled
   session's egress policy, or move health checks to a job that has
   broader access. Until resolved, keep reporting the health-check
   line as "not run," not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (95+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 96+ days,
   `mergeable_state: dirty`. Legal memo — still status-tracking: email
   drafted, awaiting Dennis send. May manual-submission backlog — one
   line, no more.

## Process watch

Tonight (2026-08-27) re-verified #175 rather than carrying it forward
— still failing for the same diagnosed Vercel Hobby-plan cron-cadence
reason, unchanged since 2026-08-18. Backlog is nine PRs deep. The
deposit-crediting failure (item 0.3 above) is the most consequential
open item on this board and has now gone a week with zero human
engagement in `#nexus` — this session sent a direct notification
alongside tonight's Slack post given the stakes and the silence.
