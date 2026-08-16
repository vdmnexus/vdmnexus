# Tomorrow's plan — 2026-08-17

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus the process-integrity item, listed first.

0. **Process integrity — auto-merge decision still open.** Tonight
   (2026-08-16) was a clean night: #171 (2026-08-15's review) had
   already merged cleanly on its own before this session started, no
   recovery needed. That's the fifth clean night out of the last six
   (#164, #167, #168, #169, #171), against seven stuck recoveries
   earlier in the run (#142, #152, #155, #163, #165, #166, #170). One
   clean night doesn't resolve the standing question — the pattern
   has already alternated between clean streaks and stuck recurrences
   once before (four clean nights, then #170 stuck ~24h). The
   auto-merge / merge-on-green ask for this loop's own docs-only
   `planning/**` + `STATUS.md` PRs is still open with no reply visible
   in `#nexus`. Keep repeating it plainly; no further escalation in
   wording until it gets an answer.
1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   nineteenth night running as the top actionable item with no PR
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
   started. Now 16 days stale as of 2026-08-16 — continue asking
   Dennis directly for a fresh update. Carry forward unchanged until
   one lands.
3. **Health checks — still an infra blocker, at least 17 consecutive
   confirmed nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   with a CONNECT-tunnel 403 — confirmed again tonight via verbose
   `curl` (the proxy itself returns `HTTP/1.1 403 Forbidden` on the
   CONNECT, before the app is ever reached), identical to every prior
   confirmed night since 2026-07-31. Needs Dennis's decision:
   allowlist these three hosts for the scheduled session's egress
   policy, or move health checks to a job that has broader access.
   Until resolved, keep reporting the health-check line as "not run,"
   not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (84+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 85+ days.
   Legal memo — still status-tracking: email drafted, awaiting Dennis
   send. May manual-submission backlog — one line, no more.

## Process watch

Tonight (2026-08-16) found #171 already merged cleanly — no recovery
needed, fifth clean night out of six. Do not read this as the pattern
resolved; #170 recurred the very cycle after four consecutive clean
nights looked the same way. Keep tracking clean-vs-stuck per night in
`STATUS.md` and keep the auto-merge ask open until Dennis answers it
either way.
