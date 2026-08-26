# Tomorrow's plan — 2026-08-27

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus the process-integrity items, listed first.

0. **Process integrity — three open decisions, zero human replies in
   `#nexus`'s entire history.** Tonight (2026-08-26) re-verified all
   seven open planning PRs (#175-#181) individually: every one still
   shows `Vercel – nexus: failure`, unchanged since the Hobby-plan
   cron-frequency limit first blocked builds 2026-08-18T20:13Z. Not
   merging any of them — genuine CI-red, not the historical
   stuck-despite-green pattern. Backlog is now eight planning PRs deep
   once tonight's opens. Three items are unanswered: (1) Vercel
   plan-vs-cron-cadence for `nexus` (since 08-21, 6 days), (2)
   auto-merge-for-planning-PRs (since 08-09, 17 days), (3) the
   deposit-scan RPC rate-limit finding below (since 08-21, 6 days,
   financial stakes). If the Vercel check clears before the next
   session, merge the backlog in order (#175 → #176 → #177 → #178 →
   #179 → #180 → #181 → 08-26's PR) rather than starting fresh.
1. **Financial-stakes: deposit-scan cron crediting 0 deposits per
   run.** Still firing every ~2 minutes but every Solana
   `getTransaction` call hits HTTP 429. On-chain USDC deposits are
   very likely not being credited right now. Needs a look at
   `SOLANA_RPC_URL` capacity — unaddressed 6+ days now.
2. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   thirtieth night running as the top actionable item with no PR
   picking it up. Three real building blocks are merged and ready to
   reuse: #156 (wallet connect, wagmi/viem, chain IDs 46630 testnet /
   4663 mainnet), #160 (`/live` reading real chain state), and #162
   (trustless vault enumeration from factory storage, no env pins).
3. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built, 26
   passing tests; M1 (vault + policy engine) in development. M2-M5 not
   started. Now 26 days stale as of 2026-08-26 — continue asking
   Dennis directly for a fresh update. Carry forward unchanged until
   one lands.
4. **Health checks — still an infra blocker, at least 27 consecutive
   confirmed nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   with a CONNECT-tunnel 403 — confirmed again tonight via curl
   (`curl: (56) CONNECT tunnel failed, response 403` on all three
   hosts). Needs Dennis's decision: allowlist these three hosts for
   the scheduled session's egress policy, or move health checks to a
   job that has broader access. Until resolved, keep reporting the
   health-check line as "not run," not pass/fail.
5. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (94+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 95+ days.
   Legal memo — still status-tracking: email drafted, awaiting Dennis
   send. May manual-submission backlog — one line, no more.

## Process watch

Tonight (2026-08-26) re-verified #175-#181 individually — all eight
consecutive nights (08-19 through 08-26) show genuinely CI-red
`Vercel – nexus` checks from the diagnosed Hobby-plan cron limit, not
the earlier stuck-despite-green pattern. Sent a direct notification
alongside tonight's Slack post, since the channel's full history shows
zero human replies to any of the seven prior nights' asks.
