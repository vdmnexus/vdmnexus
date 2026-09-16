# Tomorrow's plan — 2026-09-17

Tracked objects, in priority order (per `prompts/00-daily-review.md`).

1. **Deposit-crediting bug — live, unresolved, 26 days.**
   `/api/v1/deposits/scan` on production is still hitting `RPC
   getTransaction HTTP 429` on every scanned signature and completing
   with `credited:0` every ~2-minute run since 2026-08-21. Reconfirmed
   fresh tonight (2026-09-16) against live Vercel runtime logs: 90
   "429" hits across all 30 scan-completions in a two-hour window, all
   `credited:0`. Any on-chain USDC deposit landing in this window is
   very likely not being credited. Needs Dennis's decision on the RPC
   provider/rate limit, not another nightly re-check.
2. **Process integrity — two asks still open, unanswered in `#nexus`.**
   (a) The `nexus` Vercel project's failing check / stalled deployments
   (open since 08-19, 28 days; no `nexus` deployment newer than
   2026-08-19T20:13Z, reconfirmed fresh tonight via `list_teams` /
   `list_deployments` — still Hobby plan — this is very likely the
   same root cause blocking a code fix for item 1 from ever shipping).
   (b) Auto-merge for planning PRs (open since 08-09, 38 days) — less
   urgent procedurally since the merge-logic fix is proven across
   eleven straight clean nights (#192-#202), but still unanswered.
3. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 steps still describe Solana tooling (pump.fun,
   Squads, Solscan, Bubblemaps Solana) and need a rewrite pass for the
   Uniswap v4 / Robinhood Chain venue — 48 days unpicked since the
   2026-07-30 re-venue. Reusable building blocks already merged: #156
   (wallet connect, chain IDs 46630/4663), #160 (`/live` chain reads),
   #162 (trustless vault enumeration).
4. **Rienda M1-M5**: last report 2026-07-31 (spec complete; token +
   Uniswap v4 fee-burn hook contracts, 26 passing tests; M1 in
   development). Now 47 days stale — keep asking Dennis directly for a
   fresh status.
5. **Health checks — still egress-blocked, 48th consecutive confirmed
   night** on `nexus.vdmnexus.com`, `verify.vdmnexus.com`, and
   `www.vdmnexus.com` (proxy `connect_rejected` / `EGRESS_BLOCKED` on
   the CONNECT tunnel, confirmed directly tonight). Needs Dennis's
   call: allowlist these hosts for the scheduled session's egress
   policy, or move health checks elsewhere.
6. **Standing blocked items**: #106 (cards-v1 spec, 115 days) —
   merge-or-close decision. #95 (Polymarket agent, 116 days) — blocked
   on Spanish counsel. Legal memo — status-tracking only (email
   drafted, awaiting Dennis send). May manual-submission backlog — one
   line, no more.

## Process watch

Eleven consecutive clean nights now under the corrected merge logic:
#192 through #202, most recently #202 (2026-09-15, merged cleanly
despite `mergeable_state: unstable`). This session (2026-09-16) is
opening and merging its own PR the same way. The merge-logic fix
stays proven; the underlying `nexus` Vercel check (item 2a above) is
a separate, still-unresolved root cause and stays open on its own
merits — and remains flagged as the likely blocker on ever shipping a
code fix for the deposit-crediting bug (item 1), since no new `nexus`
deployment has gone out since 2026-08-19.
