# Tomorrow's plan — 2026-08-20

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus the process-integrity item, listed first.

0. **Process integrity — auto-merge decision still open.** Tonight
   (2026-08-19) recovered #174 (2026-08-18's review), stuck unmerged
   ~24h despite green CI — the tenth occurrence of this pattern
   (#142, #152, #155, #163, #165, #166, #170, #172, #173, #174), and
   the third consecutive stuck night (#172, #173, #174), which
   supersedes the earlier "alternates with a clean night" read. The
   auto-merge / merge-on-green ask for this loop's own docs-only
   `planning/**` + `STATUS.md` PRs has now gone unanswered in
   `#nexus` for ten days (first raised 2026-08-09). Keep repeating
   it plainly; recover and merge immediately if it recurs.
1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   twenty-second night running as the top actionable item with no PR
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
   started. Now 19 days stale as of 2026-08-19 — continue asking
   Dennis directly for a fresh update. Carry forward unchanged until
   one lands.
3. **Health checks — still an infra blocker, at least 20 consecutive
   confirmed nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   with a CONNECT-tunnel 403 — confirmed again tonight via `curl`,
   identical to every prior confirmed night since 2026-07-31. Needs
   Dennis's decision: allowlist these three hosts for the scheduled
   session's egress policy, or move health checks to a job that has
   broader access. Until resolved, keep reporting the health-check
   line as "not run," not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (87+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 88+ days.
   Legal memo — still status-tracking: email drafted, awaiting Dennis
   send. May manual-submission backlog — one line, no more.

## Process watch

Tonight (2026-08-19) recovered #174 and confirmed a third consecutive
stuck night (#172, #173, #174) — this supersedes the earlier
clean/stuck alternation read as the operative pattern. Manual recovery
is the only thing keeping it from silently stalling. Keep tracking
clean-vs-stuck per night in `STATUS.md`, keep recovering immediately
on recurrence, and keep the auto-merge ask open — it has been
unanswered in `#nexus` since 2026-08-09 (10 days).
