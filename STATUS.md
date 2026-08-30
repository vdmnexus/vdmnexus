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
— and the third *consecutive* stuck night (#172, #173, #174). This is
the **last PR to actually merge to `main`** in this saga.

**2026-08-19 → 2026-08-30: the `nexus` Vercel-check blocker, backfilled.**
Starting with #175 (2026-08-19's review), the `Vercel – nexus` check
began failing pre-build on every planning PR, and has not cleared
since. The 2026-08-20 session (#176) first noticed the pipeline had
stalled — no new deployment record at all, not a code-level failure.
The 2026-08-21 session (#177) diagnosed the cause via the Vercel API:
the `vdm-nexus` team is on the Hobby plan, which only permits daily
cron jobs, and `apps/nexus/vercel.json`'s deposit-scan cron runs every
2 minutes (`*/2 * * * *`) — Vercel now rejects the deploy outright
with an explicit error. The same session found a second, separate,
higher-stakes problem: the *surviving* (pre-#175) deposit-scan cron on
production `nexus.vdmnexus.com` is hitting Solana RPC 429s on every
`getTransaction` call and crediting 0 deposits per run — on-chain USDC
deposits are very likely not being credited to agent balances.

This is genuine CI-red, not the earlier stuck-despite-green pattern,
so the standing never-merge-without-confirmed-green-CI policy holds:
every session from #175 through #185 individually re-verified the
check (not carried forward) and found it unchanged, so none of
#175-#185 merged. Each session's `planning/**` + `STATUS.md` writes
therefore never reached `main` — this backfill entry is the first
record on `main` of what those eleven sessions found. Sequence:
#175 (08-19, first hit) → #176 (08-20, pipeline-stalled finding) →
#177 (08-21, root cause + deposit-crediting finding, first ask for a
Vercel plan-vs-cron-cadence decision) → #178 (08-22, confirmed via
Vercel team API + production runtime logs) → #179 (08-23) → #180
(08-24) → #181 (08-25, first "unanswered a full week" flag) → #182
(08-26, STATUS.md backfill attempted from that session's own branch,
never landed since it too stayed unmerged) → #183 (08-27) → #184
(08-28) → #185 (08-29, backlog reaches eleven, first direct
notification sent alongside the Slack post) → tonight's PR (08-30,
13th consecutive night, backlog reaches twelve). No product code has
merged since #162 (2026-08-06).

Three decisions have sat unanswered in `#nexus` throughout, in a
channel with zero human replies anywhere in its history: the Vercel
plan-vs-cron-cadence call for `nexus` (since 08-21), the
auto-merge-for-planning-PRs ask (since 08-09, now directly
responsible for the growing backlog), and the deposit-crediting
failure (since 08-21, financial stakes — real USDC deposits likely
going uncredited).

**If the Vercel check clears:** merge the backlog in strict order,
#175 through #185 then tonight's PR, rather than starting fresh —
each PR's `planning/daily/<date>.md` content is still valid and
should land in order.

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
