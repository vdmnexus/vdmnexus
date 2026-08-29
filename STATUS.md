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

#174 (2026-08-18 daily review) recovered and merged (`85bc1e7`) by the
2026-08-19 session before gathering — tenth occurrence of the
green-CI-but-unmerged pattern, and the third *consecutive* stuck night
(#172, #173, #174). This is the last commit on `main` as of tonight
(2026-08-29) — everything below is a backlog of unmerged PRs, not
further history on `main`.

**2026-08-19 → 2026-08-29: the `nexus` Vercel pipeline goes genuinely
CI-red and stays there.** Starting with #175 (2026-08-19's review),
every nightly planning PR through tonight's has failed the
`Vercel – nexus` check for the same diagnosed cause: the `vdm-nexus`
Vercel team is on the Hobby plan, which rejects
`apps/nexus/vercel.json`'s `*/2 * * * *` deposit-scan cron on any new
build (confirmed via the Vercel API on 2026-08-21: zero deployments
for `nexus` since 2026-08-18T20:13Z; production `nexus.vdmnexus.com`
itself is unaffected, still serving the 2026-08-17 build). This is a
different failure mode from every prior recovery on this list — those
were green-CI-but-stuck; this is genuine, reproducible CI-red, so no
session has merged any of #175 through #184 or attempted to force
them through. Backlog: #175, #176, #177, #178, #179, #180, #181,
#182, #183, #184 (ten PRs as of 2026-08-28; #185 due tonight makes
eleven). `mergeable_state` on the checked ones is `unstable`
(failing check only, no merge conflict) — if the Vercel plan or cron
cadence changes, the whole backlog should merge cleanly in order
(175→176→...→185) rather than starting fresh.

Two more findings surfaced during this stretch, both still open:
- **2026-08-21 — financial-stakes bug, independent of the Vercel
  block.** The deposit-scan cron that *is* still running (the last
  successful `nexus` build, serving production) is crediting 0
  deposits per run — every Solana `getTransaction` call is hitting
  HTTP 429. On-chain USDC deposits are very likely not being credited
  to any agent's ledger balance right now. Needs a look at
  `SOLANA_RPC_URL` capacity/provider, independent of the Vercel
  question. Unaddressed as of 2026-08-29 (8 days).
- **2026-08-09 → present — auto-merge-for-planning-PRs ask.** Now 20
  days unanswered and directly responsible for the size of the
  backlog above: if this loop could merge its own docs-only
  `planning/**` + `STATUS.md` PRs on green CI, the backlog would not
  compound the way it has.

`#nexus` has had zero human replies in its entire history
(first message 2026-06-28). The 2026-08-28 and 2026-08-29 sessions
each sent a direct notification outside Slack given the combined
duration and the financial stakes on the deposit-crediting bug.

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
