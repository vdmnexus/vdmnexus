# Tomorrow's plan — 2026-09-14

Tracked objects, in priority order (per `prompts/00-daily-review.md`).

1. **Deposit-crediting bug — live, unresolved, 23 days.**
   `/api/v1/deposits/scan` on production has been hitting `RPC
   getTransaction HTTP 429` on the scanned Solana signatures and
   completing with `credited:0` every ~2-minute run since 2026-08-21.
   Reconfirmed fresh tonight against live Vercel runtime logs (85 "429"
   hits in a two-hour window, every scan `credited:0`). Any on-chain
   USDC deposit landing in this window is very likely not being
   credited. Needs Dennis's decision on the RPC provider/rate limit,
   not another nightly re-check.
2. **Process integrity — two asks still open, unanswered in `#nexus`.**
   (a) The `nexus` Vercel project's failing check / stalled deployments
   (open since 08-21, 23 days; no `nexus` deployment newer than
   2026-08-19T20:13Z, reconfirmed via `list_deployments` tonight — this
   is very likely the same root cause blocking a code fix for item 1
   from ever shipping). (b) Auto-merge for planning PRs (open since
   08-09, 35 days) — less urgent procedurally since the merge-logic fix
   is proven across eight straight clean nights (#192-#199), but still
   unanswered.
3. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 steps still describe Solana tooling (pump.fun,
   Squads, Solscan, Bubblemaps Solana) and need a rewrite pass for the
   Uniswap v4 / Robinhood Chain venue — 45 days unpicked since the
   2026-07-30 re-venue. Reusable building blocks already merged: #156
   (wallet connect, chain IDs 46630/4663), #160 (`/live` chain reads),
   #162 (trustless vault enumeration).
4. **Rienda M1-M5**: last report 2026-07-31 (spec complete; token +
   Uniswap v4 fee-burn hook contracts, 26 passing tests; M1 in
   development). Now 44 days stale — keep asking Dennis directly for a
   fresh status.
5. **Health checks — still egress-blocked, 45th consecutive confirmed
   night** on `nexus.vdmnexus.com`, `verify.vdmnexus.com`, and
   `www.vdmnexus.com` (proxy `CONNECT tunnel failed, response 403` on
   all three, confirmed directly tonight). Needs Dennis's call:
   allowlist these hosts for the scheduled session's egress policy, or
   move health checks elsewhere.
6. **Standing blocked items**: #106 (cards-v1 spec, 112 days) —
   merge-or-close decision. #95 (Polymarket agent, 113 days) — blocked
   on Spanish counsel. Legal memo — status-tracking only (email
   drafted, awaiting Dennis send). May manual-submission backlog — one
   line, no more.

## Process watch

Eight consecutive clean nights now under the corrected merge logic:
#192 through #199, most recently #199 (2026-09-12, 7 seconds
open-to-merge). This session (2026-09-13) is opening and merging its
own PR the same way. The merge-logic fix stays proven; the underlying
`nexus` Vercel check (item 2a above) is a separate, still-unresolved
root cause and stays open on its own merits — and is now flagged as the
likely blocker on ever shipping a code fix for the deposit-crediting
bug (item 1), since no new `nexus` deployment has gone out since
2026-08-19.
