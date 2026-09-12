# Tomorrow's plan — 2026-09-13

Tracked objects, in priority order (per `prompts/00-daily-review.md`).
Process-integrity item first.

0. **Process integrity — seven clean nights confirmed under the
   corrected merge logic (#192-#198).** Treat the merge-logic fix as
   proven going forward rather than a short streak. Two asks remain
   open and unanswered in `#nexus`: (a) fix or retire the `nexus`
   Vercel project's failing check (open since 08-21, 22 days); (b)
   auto-merge for planning PRs (open since 08-09, 34 days) — less
   urgent procedurally now that the merge logic is fixed, but still
   unanswered.
1. **Deposit-crediting bug — live, unresolved, 22 days.**
   `/api/v1/deposits/scan` on production has been hitting `RPC
   getTransaction HTTP 429` on the same stuck Solana signatures and
   completing with `credited:0` every 2-minute run since 2026-08-21.
   Any on-chain USDC deposit landing in this window is very likely not
   being credited. Needs Dennis's decision on the RPC provider/rate
   limit, not another nightly re-check.
2. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 steps still describe Solana tooling (pump.fun,
   Squads, Solscan, Bubblemaps Solana) and need a rewrite pass for the
   Uniswap v4 / Robinhood Chain venue — 44 days unpicked since the
   2026-07-30 re-venue. Reusable building blocks already merged: #156
   (wallet connect, chain IDs 46630/4663), #160 (`/live` chain reads),
   #162 (trustless vault enumeration).
3. **Rienda M1-M5**: last report 2026-07-31 (spec complete; token +
   Uniswap v4 fee-burn hook contracts, 26 passing tests; M1 in
   development). Now 43 days stale — keep asking Dennis directly for a
   fresh status.
4. **Health checks — still egress-blocked, 44th consecutive confirmed
   night** on `nexus.vdmnexus.com`, `verify.vdmnexus.com`, and
   `www.vdmnexus.com` (proxy `connect_rejected` on all three, confirmed
   directly tonight). Needs Dennis's call: allowlist these hosts for
   the scheduled session's egress policy, or move health checks
   elsewhere.
5. **Standing blocked items**: #106 (cards-v1 spec, 111 days) —
   merge-or-close decision. #95 (Polymarket agent, 112 days) — blocked
   on Spanish counsel. Legal memo — status-tracking only (email
   drafted, awaiting Dennis send). May manual-submission backlog — one
   line, no more.

## Process watch

Seven consecutive clean nights now under the corrected merge logic:
#192 (2026-09-05, ~90 seconds open-to-merge), #193 (2026-09-06, ~68
seconds), #194 (2026-09-07, 8 seconds), #195 (2026-09-08, 8 seconds),
#196 (2026-09-09, 9 seconds), #197 (2026-09-10, 9 seconds), and #198
(2026-09-11, 7 seconds). This session (2026-09-12) is opening and
merging its own PR the same way. The merge-logic fix is now proven
across a full week; item 0(a) (the underlying Vercel check) is a
separate, still-unresolved root cause and stays open on its own
merits, not as a process-integrity concern.
