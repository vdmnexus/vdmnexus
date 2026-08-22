# Tomorrow's plan — 2026-08-23

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus the process-integrity item, listed first.

0. **Process integrity — two open decisions, not one.** (a) The
   auto-merge-for-planning-PRs ask has been open in `#nexus` since
   2026-08-09 with zero reply — now 13 days. Repeating plainly, no
   further escalation in wording. (b) Separately: the `nexus` Vercel
   project has been unable to deploy since 2026-08-18T20:13 because
   team `vdm-nexus` is on the Hobby plan and `apps/nexus/vercel.json`'s
   deposit-scan cron (`*/2 * * * *`) exceeds the Hobby daily-cron
   limit. Confirmed directly against the Vercel API on 2026-08-22 —
   unchanged. This has stalled #175, #176, #177 (three open,
   genuinely-CI-red planning PRs, not the historical false-stuck-
   despite-green pattern) and tonight's PR will make a fourth. Needs
   Dennis to pick: upgrade to Pro, or drop the cron cadence to
   something Hobby-compatible (tradeoff: slower deposit-scan latency).
   Production `nexus.vdmnexus.com` itself is unaffected but stale (still
   on the 2026-08-17 build). **Also confirmed independently and still
   live right now:** the deposit-scan cron is hitting Solana RPC 429s
   on every run (logs pulled tonight, last 6h) — three specific
   deposits are stuck uncredited on every single scan. This is a
   separate `SOLANA_RPC_URL` rate-limit problem, unrelated to the
   Vercel plan question, and needs its own fix (rate-limit handling or
   a paid RPC endpoint).
1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   25th night running as the top actionable item with no PR picking it
   up. Not a pure copy-substitution: the three-separate-Squads-
   multisig step and the Bubblemaps-Solana clustering check need an
   explicit Safe-multisig / Robinhood-explorer-equivalent decision
   first. Reusable building blocks already merged: #156 (wallet
   connect, wagmi/viem, chain IDs 46630 testnet / 4663 mainnet), #160
   (`/live` reading real chain state), #162 (trustless vault
   enumeration from factory storage).
2. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built, 26
   passing tests; M1 (vault + policy engine) in development. M2-M5 not
   started. Now 22+ days stale — continue asking Dennis directly for a
   fresh update. Carry forward unchanged until one lands.
3. **Health checks — still an infra blocker, at least 23 consecutive
   confirmed nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   with a CONNECT-tunnel 403 — confirmed again tonight via verbose
   curl. Needs Dennis's decision: allowlist these three hosts, or move
   health checks to a job with broader egress. Until resolved, keep
   reporting the health-check line as "not run," not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (90+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 91+ days.
   Legal memo — still status-tracking: email drafted, awaiting Dennis
   send. May manual-submission backlog — one line, no more.

## Process watch

Tonight (2026-08-22) did not merge #175/#176/#177 — CI is genuinely red
on all three (Vercel Hobby-plan cron limit blocking `nexus` deploys),
not the historical stuck-despite-green pattern, so the standing
"never merge without confirmed-green CI" policy holds. Backlog is now
3 open planning PRs and will be 4 after tonight's — worse than any
prior single-night stuck occurrence. Independently reconfirmed the
deposit-scan RPC-429 issue is still live via fresh production runtime
logs, not just carried forward from prior nights' reports. Five
consecutive nightly Slack summaries (08-17 through 08-21) have drawn
zero reply from Dennis.
