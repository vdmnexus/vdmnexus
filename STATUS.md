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
#155, #163, #165, #166, #170, #172, #173). #174 (2026-08-18 daily
review) sat stuck a third consecutive night and was recovered and
merged (`85bc1e7`) by the 2026-08-19 session — tenth occurrence,
superseding the earlier "alternates with a clean night" read.

**2026-08-19 → present: `nexus` Vercel-check blocker (genuine CI-red,
not the stuck-despite-green pattern above).** Starting with #175
(2026-08-19's review), every planning PR has failed the `Vercel –
nexus` check with "Deployment failed," diagnosed by the 2026-08-21
session: the `vdm-nexus` team is on the Hobby plan, which rejects
`apps/nexus/vercel.json`'s `*/2 * * * *` deposit-scan cron on any new
deploy (confirmed via the Vercel API — zero `nexus` deployment
records exist after 2026-08-18T20:13Z; sibling projects deploy fine;
production `nexus.vdmnexus.com` is unaffected but stale). This is a
real, diagnosed, diff-independent platform failure — every session
since has correctly declined to merge any of the backlog or its own
PR, per the standing "never merge without confirmed-green CI" policy.
Each night's session has re-verified the check fresh (not carried
forward) and grown the backlog by one: #175, #176, #177, #178, #179,
#180, #181, #182, #183, #184, #185, #186, #187 (2026-08-19 through
2026-08-31 reviews) are all open and unmerged as of 2026-09-01 —
**fourteen PRs deep** including tonight's (2026-09-01 review). `main`
has not advanced past #174 (`85bc1e7`, 2026-08-19) in this entire
window. If the Vercel check clears, merge the backlog in strict order
(#175 → #176 → ... → #187 → 2026-09-01's PR) rather than starting
fresh, so each night's plan/STATUS updates land in sequence.

**Separate, still-open finding (2026-08-21 → present): deposit-scan
cron crediting 0 deposits per run.** The surviving cron (still firing
every ~2 minutes on the last pre-block production deploy) hits Solana
RPC `getTransaction` 429s on every run and completes with
`credited:0` against the same three stuck transaction signatures.
Reconfirmed directly against live production runtime logs on
2026-08-22, 2026-08-30, 2026-08-31, and 2026-09-01 — unchanged each
time. On-chain USDC deposits sent to the Nexus deposit address in
this window very likely have not been credited to agent balances.
This is independent of the Vercel plan/cron-cadence question above
and needs a look at `SOLANA_RPC_URL` capacity/rate limits. 11 days
running as of 2026-09-01.

**Three decisions remain open in `#nexus`, unanswered by any human
message in the channel's history:** (1) Vercel plan-vs-cron-cadence
for `nexus`, open since 2026-08-21. (2) auto-merge-for-planning-PRs,
open since 2026-08-09 — now directly responsible for the fourteen-PR
backlog. (3) the deposit-crediting failure above, open since
2026-08-21. The 2026-08-31 session found the Dennis Slack DM channel
empty despite two prior nights (08-29, 08-30) reporting a "direct
notification" sent alongside the Slack post — flagging a possible
delivery gap. The 2026-09-01 session escalated through the
scheduled-task notification channel directly given the financial
stakes and duration.

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
