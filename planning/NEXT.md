# Tomorrow's plan — 2026-09-06

Tracked objects, in priority order (per `prompts/00-daily-review.md`).
Process-integrity item first.

0. **Process integrity — backlog cleared, root cause fixed, three asks
   still open.** `main` was stuck at #174 (2026-08-19) for seventeen
   nights because the `nexus` Vercel project's failing status check
   flips every planning PR's `mergeable_state` to `unstable`, and prior
   sessions treated anything short of `clean` as unmergeable — so
   nobody tried merging, and the backlog (#175-#191) grew silently.
   Tonight: merged #175, closed #176-#191 (superseded, content
   preserved on their branches), and corrected the merge logic —
   `unstable` is mergeable via the API unless GitHub also reports
   `dirty`/`blocked`. Verify tomorrow that tonight's own PR merged
   the same way and that `main` stays current going forward, one PR
   per night. Three asks remain open and unanswered in `#nexus`:
   (a) fix or retire the `nexus` Vercel project's failing check
   (Hobby-plan/cron-cadence question, open since 08-21, 16 days);
   (b) auto-merge for planning PRs, open since 08-09 (28 days) — now
   addressed procedurally by (0) above, but Dennis still hasn't
   weighed in; (c) the deposit-crediting bug below, open since 08-21
   (16 days) and financially live.
1. **Deposit-crediting bug — live, unresolved, 16 days.**
   `/api/v1/deposits/scan` on production still hits `RPC getTransaction
   HTTP 429` on the same three stuck Solana signatures and completes
   with `credited:0` every 2-minute run, reconfirmed directly against
   runtime logs tonight (15/15 invocations, 19:34-20:12 UTC). Any
   on-chain USDC deposit landing in this window is very likely not
   being credited. Needs Dennis's decision on the RPC provider/rate
   limit, not another nightly re-check.
2. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 steps still describe Solana tooling (pump.fun,
   Squads, Solscan, Bubblemaps Solana) and need a rewrite pass for the
   Uniswap v4 / Robinhood Chain venue — now the top unpicked build item
   for over three weeks running. Reusable building blocks already
   merged: #156 (wallet connect, chain IDs 46630/4663), #160 (`/live`
   chain reads), #162 (trustless vault enumeration).
3. **Rienda M1-M5**: last report 2026-07-31 (spec complete; token +
   Uniswap v4 fee-burn hook contracts, 26 passing tests; M1 in
   development). Now 37 days stale — keep asking Dennis directly.
4. **Health checks — still egress-blocked, 37th consecutive confirmed
   night** on `nexus.vdmnexus.com`, `verify.vdmnexus.com`, and
   `www.vdmnexus.com`. Needs Dennis's call: allowlist these hosts for
   the scheduled session's egress policy, or move health checks
   elsewhere.
5. **Standing blocked items**: #106 (cards-v1 spec, 104 days) —
   merge-or-close decision. #95 (Polymarket agent, 105 days) — blocked
   on Spanish counsel. Legal memo — status-tracking only (email
   drafted, awaiting Dennis send). May manual-submission backlog — one
   line, no more.

## Process watch

Tonight cleared a seventeen-PR backlog (#175-#191) that had accumulated
since 2026-08-19 because sessions only attempted to merge a stuck PR
when GitHub reported `mergeable_state: clean`. The `nexus` Vercel
project has been failing its check every night since 08-19 (no
deployment produced at all), which keeps every PR at `unstable` instead
— still mergeable via the API, just never tried. Fixed the logic
tonight; watch that it holds for a few nights before treating this as
resolved rather than one data point.
