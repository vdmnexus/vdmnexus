# Tomorrow's plan — 2026-08-29

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus the process-integrity item, listed first.

0. **Process integrity — three unanswered decisions, now with real
   cost to waiting.** Ten consecutive nights (2026-08-18 →
   2026-08-28) of genuine, diagnosed CI-red on the `nexus` Vercel
   project — Hobby-plan cron-frequency limit rejecting
   `apps/nexus/vercel.json`'s `*/2 * * * *` deposit-scan cron,
   unchanged since 2026-08-18T20:13Z. This is a different failure mode
   from the earlier green-CI-but-unmerged pattern (#142 through #174):
   it has an identified root cause and two concrete fixes (upgrade
   `vdm-nexus` to Pro, or drop the cron to once-daily), neither
   applied. It has produced a nine-deep planning-PR backlog
   (#175-#183), soon ten. Two other decisions remain open the same
   length of time: the auto-merge-for-planning-PRs ask (since 08-09,
   19 days) and — with real financial stakes — the deposit-scan cron
   crediting 0 deposits per run because Solana RPC calls are getting
   429'd (found 08-21, unaddressed 7 days; on-chain USDC deposits are
   very likely not being credited right now). `#nexus` has had zero
   human replies since its first message on 2026-06-28. Keep repeating
   all three plainly; a direct notification went out alongside
   tonight's Slack post given the stakes and total silence.
1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   thirty-third night running as the top actionable item with no PR
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
   started. Now 28 days stale as of 2026-08-28 — continue asking
   Dennis directly for a fresh update. Carry forward unchanged until
   one lands.
3. **Health checks — still an infra blocker, at least 29 consecutive
   confirmed nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   with a CONNECT-tunnel rejection — confirmed again tonight via curl
   (`connect_rejected` / organization policy on all three hosts),
   identical to every prior confirmed night since 2026-07-31. Needs
   Dennis's decision: allowlist these three hosts for the scheduled
   session's egress policy, or move health checks to a job that has
   broader access. Until resolved, keep reporting the health-check
   line as "not run," not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (96+ days), `mergeable_state:
   clean`. #95 (Polymarket agent) — still blocked on Spanish counsel,
   97+ days, now `mergeable_state: dirty` (a real merge conflict, not
   just staleness). Legal memo — still status-tracking: email drafted,
   awaiting Dennis send. May manual-submission backlog — one line, no
   more.
5. **If the Vercel check clears before the next session**, merge the
   backlog in order (#175 → #176 → #177 → #178 → #179 → #180 → #181 →
   #182 → #183 → 2026-08-28's own PR) rather than starting fresh.

## Process watch

Tonight (2026-08-28) re-verified #183 individually — still genuine
CI-red on `nexus` (Hobby-plan cron limit), unchanged since 2026-08-18.
Backlog is nine PRs deep, soon ten. Three decisions have now sat
unanswered a week or more in a Slack channel with zero human replies
ever; one of them (deposit-scan crediting 0 deposits) has real
financial stakes. Escalated out-of-band tonight given the duration and
silence.
