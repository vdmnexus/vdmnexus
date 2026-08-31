# Tomorrow's plan — 2026-09-01

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus the process-integrity item, listed first.

0. **Process integrity — three open decisions, unanswered a full
   month combined.** Tonight (2026-08-31) re-verified the `nexus`
   Vercel-check failure fresh three independent ways (PR #186 status,
   Vercel team plan via `list_teams`, Vercel deployment history via
   `list_deployments`): still `Vercel – nexus: failure`, unchanged
   since 2026-08-18T20:13Z — the **14th consecutive night**, diagnosed
   cause unchanged (Hobby-plan cron-frequency limit rejecting
   `apps/nexus/vercel.json`'s `*/2 * * * *` deposit-scan cron; no
   deployment record exists at all for #175-#186). Not merging
   #175-#186 or tonight's PR — genuine CI-red, so the
   never-merge-without-confirmed-green-CI policy holds. Backlog is now
   **thirteen** open planning PRs. If the check clears before the next
   session, merge in order #175 → ... → #186 → tonight's PR, rather
   than starting fresh. Three decisions remain open in `#nexus`, a
   channel with zero human replies anywhere in its history: (1) Vercel
   plan-vs-cron-cadence for `nexus`, since 08-21 (10 days). (2)
   auto-merge-for-planning-PRs ask, since 08-09 (22 days) — now
   directly responsible for the backlog size. (3) financial stakes —
   the deposit-scan cron is crediting 0 deposits per run, reconfirmed
   tonight directly against live production runtime logs (every
   ~2-minute cron run in the last 2h: `credited:0`, RPC `getTransaction`
   429 on every transaction seen), on-chain USDC deposits very likely
   still not being credited, unaddressed since 08-21 (10 days).
   Tonight's session also checked the Dennis Slack DM channel directly
   and found it empty — the "direct notification" prior sessions
   (08-29, 08-30) reported sending does not appear to have reached
   Dennis via Slack DM. Next session: confirm whether that
   notification landed by any channel, and keep repeating all three
   decisions plainly until one gets a reply.
1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   37th night running as the top actionable item with no PR picking
   it up. Not a pure copy-substitution: the three-separate-Squads-
   multisig step and the Bubblemaps-Solana clustering check need an
   explicit Safe-multisig / Robinhood-explorer-equivalent decision
   first, not just a renamed tool. Three real building blocks are
   merged and ready to reuse: #156 (wallet connect, wagmi/viem, chain
   IDs 46630 testnet / 4663 mainnet), #160 (`/live` reading real
   chain state), and #162 (trustless vault enumeration from factory
   storage, no env pins).
2. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built, 26
   passing tests; M1 (vault + policy engine) in development. M2-M5 not
   started. Now 31 days stale as of 2026-08-31 — continue asking
   Dennis directly for a fresh update. Carry forward unchanged until
   one lands.
3. **Health checks — still an infra blocker, 32 consecutive confirmed
   nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   with a CONNECT-tunnel 403 — confirmed again tonight via verbose
   curl (`CONNECT tunnel: HTTP/1.1 negotiated` then `HTTP/1.1 403
   Forbidden`), identical to every prior confirmed night since
   2026-07-31. Needs Dennis's decision: allowlist these three hosts
   for the scheduled session's egress policy, or move health checks to
   a job that has broader access. Until resolved, keep reporting the
   health-check line as "not run," not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (99 days). #95 (Polymarket
   agent) — still blocked on Spanish counsel, 100 days, now
   `mergeable_state: dirty`. Legal memo — still status-tracking: email
   drafted, awaiting Dennis send. May manual-submission backlog — one
   line, no more.

## Process watch

Tonight (2026-08-31) re-verified the `nexus` Vercel-check failure
fresh — 14th consecutive night, unchanged since 2026-08-18T20:13Z.
Not merging the thirteen-deep backlog (#175-#186 + tonight's PR).
Reconfirmed the deposit-crediting failure directly against live
production runtime logs (still `credited:0` every ~2-minute run).
Checked the Dennis Slack DM channel and found it empty — the "direct
notification" reported sent the last two nights is not confirmed to
have reached Dennis that way. Escalating through the scheduled-task
notification channel tonight given the financial stakes and the
DM-delivery gap.
