# Tomorrow's plan — 2026-08-21

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus tonight's new Vercel-deploy finding, listed first, and the
process-integrity item second.

0. **New — `nexus` Vercel deploy failure, needs Dennis's eyes.** PR
   #175 (2026-08-19's review) has a failing `Vercel – nexus` check
   (`state: failure`, "Deployment failed") — the other three checks
   (docs, console, vdmnexus-web) passed. Not merged tonight: every
   prior recovery (#142 through #174) required confirmed-green CI
   first, and this one fails that bar. This session couldn't diagnose
   further — the GitHub status API's `target_url` is a `vercel.link`
   short-link this session's egress policy blocks, and Vercel's own
   API 404s on both a branch-alias lookup and a build-log lookup for
   it. Checked production directly instead: `nexus.vdmnexus.com`'s
   live alias is still on the deployment built from `f0b53cf` (PR
   #173, 2026-08-17) — `READY`, alias intact, no sign of an outage —
   but that also means the `nexus` Vercel project hasn't taken a
   successful production deploy in 3 days, through 2 merges (#174 was
   docs-only, so nothing functional was skipped, but the pipeline
   itself looks stuck). Needs Dennis to check the Vercel dashboard
   for the `nexus` project directly. If a fresh session finds #175
   still red, re-check status and escalate again if unresolved.
1. **Process integrity — auto-merge decision still open.** Now 11
   nights unanswered (first raised 2026-08-09). Tonight didn't add a
   new occurrence of the old pattern (see item 0 above — different
   failure mode). Keep repeating the ask plainly.
2. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   twenty-third night running as the top actionable backlog item with
   no PR picking it up. Not a pure copy-substitution: the
   three-separate-Squads-multisig step and the Bubblemaps-Solana
   clustering check need an explicit Safe-multisig /
   Robinhood-explorer-equivalent decision first, not just a renamed
   tool. Three real building blocks are merged and ready to reuse:
   #156 (wallet connect, wagmi/viem, chain IDs 46630 testnet / 4663
   mainnet), #160 (`/live` reading real chain state), and #162
   (trustless vault enumeration from factory storage, no env pins).
3. **Rienda M1-M5**: last reported status (2026-07-31, from Dennis) —
   spec complete; token + Uniswap v4 fee-burn hook contracts built, 26
   passing tests; M1 (vault + policy engine) in development. M2-M5 not
   started. Now 20 days stale as of 2026-08-20 — continue asking
   Dennis directly for a fresh update. Carry forward unchanged until
   one lands.
4. **Health checks — still an infra blocker, at least 21 consecutive
   confirmed nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   with a connection failure — confirmed again tonight via curl
   (exit 56 on all three hosts), identical to every prior confirmed
   night since 2026-07-31. Needs Dennis's decision: allowlist these
   three hosts for the scheduled session's egress policy, or move
   health checks to a job that has broader access. Until resolved,
   keep reporting the health-check line as "not run," not pass/fail.
5. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (88+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 89+ days.
   Legal memo — still status-tracking: email drafted, awaiting Dennis
   send. May manual-submission backlog — one line, no more.

## Process watch

Tonight (2026-08-20) did not recover a stuck-but-green PR — instead
found PR #175 has an actual failing `Vercel – nexus` check, a new
failure mode. Left it unmerged. Also found the `nexus` Vercel
project's production alias hasn't redeployed since 2026-08-17 (3
days). Flagged directly to Dennis; needs the Vercel dashboard to
diagnose further. The older auto-merge-for-planning-PRs ask stays
open too, now 11 nights unanswered.
