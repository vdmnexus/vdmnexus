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

**#174 (2026-08-18 daily review) merged cleanly** (`85bc1e7`) the same
night — no recovery needed. This is the last PR to merge into `main`.

**Backlog since 2026-08-19: a different failure mode, genuinely
CI-red, not stuck-despite-green.** Starting with #175 (2026-08-19's
review), the `nexus` Vercel project stopped building entirely: the
Hobby-plan cron-frequency limit rejects `apps/nexus/vercel.json`'s
`*/2 * * * *` deposit-scan cron on any new build. Confirmed
repeatedly via the Vercel API (`list_teams`, `list_deployments`) —
zero `nexus` deployments since `2026-08-18T20:13Z`. Production
`nexus.vdmnexus.com` is unaffected (serving the last good build) but
stale. Every planning PR since (#175 through #190, sixteen PRs as of
2026-09-03, seventeen after tonight's) shows `Vercel – nexus: failure`
and is correctly *not* being merged — merging over genuinely red CI
would break the established recovery rule. Merge order if the check
ever clears: #175 → #176 → ... → #190 → tonight's.

**Separate live finding (2026-08-21): deposit-scan cron crediting 0
deposits per run.** Independent of the Vercel build issue above — the
last-good `nexus` build's `/api/v1/deposits/scan` cron is still firing
every 2 minutes, but every Solana RPC `getTransaction` call for the
stuck transaction signatures returns HTTP 429, so every run completes
with `credited: 0`. Reconfirmed against live production runtime logs
every night since discovery, most recently tonight (2026-09-04): 20
scan invocations in a ~2h window, all `credited: 0`, 70 log lines
referencing 429s. On-chain USDC deposits are very likely not being
credited to agent balances — 14 days running as of tonight. Needs a
look at `SOLANA_RPC_URL` capacity/provider, independent of the Vercel
plan decision.

**Three decisions have been open in `#nexus` with zero human reply
across the channel's entire history** (checked fresh every night):
(1) Vercel plan-vs-cron-cadence for `nexus`, since 2026-08-21; (2)
auto-merge-for-planning-PRs, since 2026-08-09 — now the direct cause
of the 17-PR backlog; (3) the deposit-crediting failure above, since
2026-08-21 (financial stakes). Direct scheduled-task notifications
were sent on 2026-09-01 and 2026-09-03 in addition to the nightly
Slack posts; a 2026-08-31 check found the Slack DM channel to Dennis
empty, so that escalation path may not be landing either. Tonight
(2026-09-04) sent another direct notification given the bug's
duration and stakes.

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
