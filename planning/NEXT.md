# Tomorrow's plan — 2026-08-22

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus two new infra findings from tonight (2026-08-21), listed first —
they outrank the standing process-integrity item since they're now
concrete and actionable rather than a recurring status ask.

1. **Deposit-scan RPC rate-limiting — new, top priority.** Confirmed
   tonight via production runtime logs: `/api/v1/deposits/scan` is
   running on its 2-minute schedule but every Solana `getTransaction`
   call is returning HTTP 429, crediting 0 of ~10 transactions per run.
   Needs Dennis to look at `SOLANA_RPC_URL` — likely a shared/public
   RPC endpoint hitting rate limits; a paid or dedicated RPC provider
   (or backoff/batching in `apps/nexus/lib/deposits.ts`) is probably
   needed. Agents sending USDC to the deposit address are very likely
   not being credited right now. This loop cannot query Solana RPC
   directly to confirm root cause beyond what the app's own logs show.
2. **`nexus` Vercel deploy blocker — now diagnosed, needs a decision.**
   Root cause confirmed tonight: the `vdm-nexus` Vercel team's plan
   (Hobby-tier cron limit, inferred from the deploy error text — not
   confirmed via a billing API) rejects the existing `*/2 * * * *`
   deposit-scan cron on any new deploy of the `nexus` project, blocking
   builds since 2026-08-18T20:13Z (3 days). Production
   `nexus.vdmnexus.com` itself is unaffected — still serving the
   2026-08-17 build, and the cron kept running from that build (see
   item 1 for why it's not actually helping). Two ways to unblock new
   deploys: (a) upgrade the team to Pro, or (b) change the cron
   cadence in `apps/nexus/vercel.json` to something Hobby-compatible
   (trades off deposit-detection latency). Needs Dennis's call; this
   loop won't change billing or the cron config unprompted.
3. **Auto-merge-for-planning-PRs ask — now directly relevant to #1/#2.**
   Open and unanswered since 2026-08-09 (12+ days). PR #175
   (2026-08-19 review) and #176 (2026-08-20 review) are both still
   open, genuinely red on the `Vercel – nexus` check (not the earlier
   false-stuck-despite-green pattern) — tonight's PR is likely to join
   them for the same reason. Resolving the auto-merge ask (merge on
   green CI, or stop gating `planning/**` + `STATUS.md`-only PRs on
   the `Vercel – nexus` check) would clear this backlog regardless of
   the cron/plan decision above.
4. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   and need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   24th night running as the top actionable item with no PR picking it
   up. Building blocks merged and ready: #156, #160, #162.
5. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built, 26
   passing tests; M1 (vault + policy engine) in development. Now 21
   days stale — continue asking Dennis directly. Carry forward
   unchanged until a fresh report lands.
6. **Health checks — still an infra blocker, at least 22 consecutive
   confirmed nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   with a CONNECT-tunnel error (curl exit 56) — confirmed again
   tonight, identical to every prior confirmed night since 2026-07-31.
   Needs Dennis's decision: allowlist these three hosts, or move
   health checks to a job with broader access. Keep reporting as "not
   run," not pass/fail.
7. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (89+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 90+ days.
   Legal memo — still status-tracking: email drafted, awaiting Dennis
   send. May manual-submission backlog — one line, no more.

## Process watch

Tonight (2026-08-21) diagnosed two concrete infra issues instead of
recovering a stuck PR: the `nexus` Vercel project's builds have been
blocked for 3 days by a Hobby-plan cron-frequency limit, and the
deposit-scan cron that survived that block is crediting 0 deposits per
run due to Solana RPC 429s. #175 and #176 stay unmerged (genuinely red
CI); tonight's PR is likely to join them. Keep both findings open until
Dennis responds.
