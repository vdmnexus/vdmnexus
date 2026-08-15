# Tomorrow's plan — 2026-08-16

Tracked objects, in priority order (per `prompts/00-daily-review.md`):
launch readiness, Rienda M1-M5, site/API health, standing-blocked items.
Plus the process-integrity item from the last two nights, listed first.

0. **Process integrity — still needs a decision from Dennis.** Two
   distinct failures landed back to back: 2026-08-13 had no commit at
   all despite a Slack post claiming success, and 2026-08-14's real
   PR (#170) then sat unmerged with green CI for ~24h before this
   session recovered and merged it tonight. That's the seventh
   green-CI-but-unmerged occurrence (#142, #152, #155, #163, #165,
   #166, #170), recurring right after four nights (#164, #167, #168,
   #169) that looked like the pattern was resolved. Concrete ask,
   repeated until answered: turn on auto-merge (or a merge-on-green
   branch protection rule / Action) for this loop's own docs-only
   `planning/**` + `STATUS.md` PRs. Manual recovery has now failed
   outright once (missed a full night) and been slow once (24h) in
   the last five nights — it isn't reliable enough on its own anymore.
1. **Launch readiness** (`marketing/token-launch-checklist.md`): the
   T-14 / T-48h / T-0 operational steps still describe Solana tooling
   (pump.fun deploy, Squads multisigs, Solscan, Bubblemaps Solana) and
   need a rewrite pass for the Uniswap v4 / Robinhood Chain venue —
   eighteenth night running as the top actionable item with no PR
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
   started. Now 15 days stale as of 2026-08-15 — continue asking
   Dennis directly for a fresh update. Carry forward unchanged until
   one lands.
3. **Health checks — still an infra blocker, at least 16 consecutive
   confirmed nights.** This session's outbound proxy rejects
   `www.vdmnexus.com`, `verify.vdmnexus.com`, and `nexus.vdmnexus.com`
   with a CONNECT-tunnel 403 — confirmed again tonight via `curl`,
   identical to every prior confirmed night since 2026-07-31. Needs
   Dennis's decision: allowlist these three hosts for the scheduled
   session's egress policy, or move health checks to a job that has
   broader access. Until resolved, keep reporting the health-check
   line as "not run," not pass/fail.
4. **Standing blocked items**: #106 (cards-v1 spec) — still a merge-
   or-close decision, open since 2026-05-24 (83+ days). #95
   (Polymarket agent) — still blocked on Spanish counsel, 84+ days.
   Legal memo — still status-tracking: email drafted, awaiting Dennis
   send. May manual-submission backlog — one line, no more.

## Process watch

Tonight (2026-08-15) recovered #170 and, for the first time, actually
surfaced the 2026-08-13 no-commit gap to Dennis in Slack (the
2026-08-14 session had found it but never posted). Three different
failure modes in five nights (clean run, no-commit-at-all, and
stuck-PR-with-silent-Slack-gap) is the basis for tonight's stronger
auto-merge ask in item 0. If a fresh session ever finds #170-style
green-CI-unmerged PR again, recover and merge it immediately before
gathering, same as tonight, and keep escalating the auto-merge
decision rather than treating each occurrence as a one-off.
