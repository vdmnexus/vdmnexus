# In-flight work

Single source of truth for what's running across parallel Claude Code
sessions. Every session updates its own row at start and end.

## Active branches

| Branch | What | Started | Status | PR |
|---|---|---|---|---|
| (none) | | | | |

#149, #150, #151 merged as of 2026-07-31; #156, #157, #158 (rebrand +
wallet connect, og:image, `/build` page) merged as of 2026-08-04;
#160 (`/live` chain reads) and #162 (trustless vault enumeration)
merged as of 2026-08-06; #163 (2026-08-06 daily review, recovered
from a stuck-unmerged state) merged 2026-08-07; #165 (2026-08-08
daily review, recovered from a stuck-unmerged state — fifth such
recovery: #142, #152, #155, #163, #165) merged 2026-08-09; #166
(2026-08-09 daily review, recovered from a stuck-unmerged state —
sixth such recovery, and the first time it happened two nights in a
row) merged 2026-08-10; #167 (2026-08-10 daily review) merged
cleanly the same night — no recovery needed, second clean night
(after #164) against six stuck recoveries in the same window; #168
(2026-08-11 daily review) merged within 5 seconds of opening — third
clean night in a row, same window; #169 (2026-08-12 daily review)
also merged cleanly — fourth clean night in a row.

**2026-08-13 gap.** A "Daily review 2026-08-13" summary was posted to
`#nexus` that night, but no matching PR, branch, or commit exists in
this repo — `main` went straight from #169 (2026-08-12) to #170
(2026-08-14) with no commit in between. Different failure mode from
the green-CI-but-unmerged pattern above: here nothing was ever pushed.
The 2026-08-14 session found and documented this in #170's body, but
that session never posted to Slack, so Dennis was not actually told
until the 2026-08-15 session's summary. Nothing left to recover
in-repo for 08-13 itself.

**#170 (2026-08-14 daily review) — stuck unmerged for ~24h despite
green CI** (`mergeable_state: clean`, 4/4 Vercel checks passing).
Recovered and merged (`a930492`) by the 2026-08-15 session before
gathering. Seventh occurrence of the green-CI-but-unmerged pattern
(#142, #152, #155, #163, #165, #166, #170) — notably recurring right
after four consecutive clean nights (#164, #167, #168, #169) that had
looked like resolution. Combined with the 08-13 no-commit gap, three
distinct failure modes have now shown up in five nights. 2026-08-15's
daily review escalates the auto-merge-for-planning-PRs ask on the
strength of this recurrence.

#171 (2026-08-15 daily review) merged cleanly the same night (`e6e5dc4`)
— no recovery needed. Fifth clean night out of the last six (#164,
#167, #168, #169, #171) against seven earlier stuck recoveries. The
2026-08-16 session confirmed this directly against `main` before
gathering and treated it as one data point, not resolution — the
auto-merge ask stays open pending a decision from Dennis.

**#172 (2026-08-16 daily review) — stuck unmerged for ~24h despite
green CI** (`mergeable_state: clean`, 4/4 Vercel checks passing).
Recovered and merged (`c467903`) by the 2026-08-17 session before
gathering. Eighth occurrence of the green-CI-but-unmerged pattern
(#142, #152, #155, #163, #165, #166, #170, #172) — and the second
time the pattern has alternated a clean night straight into a stuck
one (previously #164-#169 clean → #170 stuck; now #171 clean → #172
stuck). The auto-merge-for-planning-PRs ask has been open in `#nexus`
since 2026-08-09 with no reply.

**#173 (2026-08-17 daily review) — stuck unmerged ~24h despite green
CI** (`mergeable_state: clean`, 4/4 Vercel checks passing). Recovered
and merged (`f0b53cf`) by the 2026-08-18 session before gathering.
Ninth occurrence of the green-CI-but-unmerged pattern (#142, #152,
#155, #163, #165, #166, #170, #172, #173) — the third time the
pattern has alternated a clean night into a stuck one. The
auto-merge-for-planning-PRs ask has been open in `#nexus` and
unanswered since 2026-08-09 (9+ days); manual recovery is holding
every night but the underlying question is unresolved.

**#174 (2026-08-18 daily review) — stuck unmerged ~24h despite green
CI.** Recovered and merged (`85bc1e7`) by the 2026-08-19 session
before gathering. Tenth occurrence of the green-CI-but-unmerged
pattern (#142, #152, #155, #163, #165, #166, #170, #172, #173, #174)
— and the third *consecutive* stuck night (#172, #173, #174),
superseding the earlier clean/stuck-alternation read.

**#175 (2026-08-19 daily review) and #176 (2026-08-20 daily review) —
new failure mode, not the green-CI-but-unmerged pattern above.** Both
still open as of 2026-08-21. Unlike #142-#174, CI on these two is
*genuinely* red (`Vercel – nexus` check: "Deployment failed"), not a
false-stuck-despite-green case, so neither was merged by the
2026-08-20 or 2026-08-21 sessions per the standing "never merge
without confirmed-green CI" policy.

**Root cause found 2026-08-21.** The `Vercel – nexus` check is failing
because the `vdm-nexus` Vercel team's plan (Hobby-tier cron limit,
inferred from the deploy error text — no billing API available to
confirm the tier directly) rejects the project's existing
`*/2 * * * *` deposit-scan cron (`apps/nexus/vercel.json`, unchanged)
on any new deploy. Confirmed via the Vercel API: zero deployment
records of any kind exist for the `nexus` project after
2026-08-18T20:13:09Z (the last one that built, `dpl_87VBtuek…`) — the
plan/cron check fails pre-build, not a code regression in either PR's
diff. Sibling projects (`vdmnexus-web`, `docs`, `console`) on the same
team deployed fine on both pushes — isolated to `nexus`. Production
`nexus.vdmnexus.com` itself is unaffected (still serving the
2026-08-17 build, `f0b53cf`), and Vercel does not retroactively kill a
cron already attached to a live deployment on a plan downgrade — it
only blocks *new* deploys carrying a violating cron config. So the
existing cron kept firing every ~2 minutes straight through tonight.

**Separate finding, same night: the surviving cron isn't crediting
anything.** `get_runtime_logs` on the live production deployment shows
`/api/v1/deposits/scan` running on schedule but every Solana
`getTransaction` RPC call returning HTTP 429 (rate-limited), crediting
0 of ~10 transactions per run. Independent of the deploy-blocker above
— on-chain USDC deposits are very likely not being credited to the
ledger right now. Needs Dennis's attention on `SOLANA_RPC_URL` /
`apps/nexus/lib/deposits.ts` regardless of the Vercel plan decision.

Tonight's own PR (2026-08-21 review) will very likely hit the same
`Vercel – nexus` failure for the same reason (the cron config is
unchanged) and join #175/#176 as a third unmerged planning PR unless
Dennis resolves the plan/cron question or the still-open auto-merge-
for-planning-PRs ask (open since 2026-08-09, 12+ days unanswered).

## Conventions

- One session = one branch = one PR. Never two sessions on the same branch.
- Branch name pattern: `claude/<short-kebab-name>`.
- Status values: `in_progress`, `in_review` (PR open, CI green, ready for merge),
  `merged`, `paused`, `blocked`, `abandoned`.
- Update the row when the PR opens and when it merges. Delete the row
  once merged + the build_log entry is in.
- If a branch is paused, write a one-line note in the row about *why*
  and what unblocks it.

## Cap on parallel work

**Max 3 active branches.** More than that and review quality drops below
the productivity gain. If you'd be the 4th, wait for one to merge first.
