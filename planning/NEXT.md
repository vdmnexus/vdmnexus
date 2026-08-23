# Tomorrow's plan — 2026-08-24

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus the process-integrity item, listed first.

1. **Process integrity — two open decisions, repeated plainly.**
   (a) Vercel plan-vs-cron-cadence for `nexus` — the `Vercel – nexus`
   check has failed on every planning PR since 2026-08-18T20:13Z
   (Hobby-plan cron-frequency limit rejecting the existing
   `*/2 * * * *` deposit-scan cron in `apps/nexus/vercel.json`).
   Re-verified tonight (2026-08-23) against #175/#176/#177/#178
   individually — all four still fail the same check, unchanged.
   Needs Dennis's call: upgrade the `vdm-nexus` Vercel team to Pro,
   or drop the cron cadence to once-daily. (b) Auto-merge for
   docs-only `planning/**` + `STATUS.md` PRs — open and unanswered
   in `#nexus` since 2026-08-09 (14+ days). Neither ask has had a
   reply; no further escalation in wording until one lands. If the
   Vercel check goes green on its own before the next session, merge
   the accumulated backlog in order (#175 → #176 → #177 → #178 →
   #179) rather than starting fresh.
2. **Separate, still-open finding: deposit-scan cron crediting 0 per
   run due to Solana RPC 429s** (found 2026-08-21). Independent of
   the Vercel plan question — on-chain USDC deposits are very likely
   not being credited right now. Needs a look at `SOLANA_RPC_URL`
   capacity/rate limits; not fixable from this read-only loop.
3. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   twenty-seventh night running as the top actionable item with no PR
   picking it up. Not a pure copy-substitution: the three-separate-
   Squads-multisig step and the Bubblemaps-Solana clustering check
   need an explicit Safe-multisig / Robinhood-explorer-equivalent
   decision first, not just a renamed tool. Three real building blocks
   are merged and ready to reuse: #156 (wallet connect, wagmi/viem,
   chain IDs 46630 testnet / 4663 mainnet), #160 (`/live` reading real
   chain state), and #162 (trustless vault enumeration from factory
   storage, no env pins).
4. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built, 26
   passing tests; M1 (vault + policy engine) in development. M2-M5 not
   started. Now 23 days stale as of 2026-08-23 — continue asking
   Dennis directly for a fresh update. Carry forward unchanged until
   one lands.
5. **Health checks — still an infra blocker, at least 24 consecutive
   confirmed nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   with a CONNECT-tunnel 403 — confirmed again tonight via curl
   (`curl: (56) CONNECT tunnel failed, response 403` on all three
   hosts), identical to every prior confirmed night since 2026-07-31.
   Needs Dennis's decision: allowlist these three hosts for the
   scheduled session's egress policy, or move health checks to a job
   that has broader access. Until resolved, keep reporting the
   health-check line as "not run," not pass/fail.
6. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (91+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 92+ days.
   Legal memo — still status-tracking: email drafted, awaiting Dennis
   send. May manual-submission backlog — one line, no more.

## Process watch

Tonight (2026-08-23) re-verified #175/#176/#177/#178 are all still
CI-red on the diagnosed Vercel Hobby-plan cron-limit issue, unchanged
since 2026-08-18. Not merging any of them or tonight's PR — the
planning-PR backlog is now five deep. Keep re-verifying (not just
carrying forward) each night, and merge the backlog in order the
moment the Vercel check clears.
