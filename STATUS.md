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

**#174 (2026-08-18 daily review) merged cleanly** (`85bc1e7`,
2026-08-19) — no recovery needed. This is the last commit `main` has
seen; everything below happened only in unmerged PRs, because the
next failure mode wasn't a stuck-despite-green PR but genuine CI-red.

**2026-08-19 → 2026-08-25: a new, different failure mode — genuine
CI-red, not stuck-despite-green.** Starting with #175 (2026-08-19's
review), the `Vercel – nexus` check began failing pre-build on every
planning PR with an explicit Vercel error: "Hobby accounts are
limited to daily cron jobs. This cron expression (`*/2 * * * *`)
would run more than once per day." `apps/nexus/vercel.json`'s
deposit-scan cron has always run every 2 minutes; this only started
blocking builds at 2026-08-18T20:13Z, consistent with the `vdm-nexus`
Vercel team being on (or dropping to) the Hobby tier. Confirmed
diff-independent: the failure hits every PR regardless of content,
`Vercel – docs`/`console`/`vdmnexus-web` stay green throughout, and
production `nexus.vdmnexus.com` keeps serving its last good build
(`f0b53cf`, 2026-08-17) unaffected. Per the standing
"never-merge-without-confirmed-green-CI" policy, none of these PRs
have been merged: #175 (08-19), #176 (08-20), #177 (08-21), #178
(08-22), #179 (08-23), #180 (08-24), #181 (08-25) — each night
re-verified individually rather than trusted from the prior PR's
body, unchanged every time. **Backlog is seven open planning PRs as
of tonight.** If the Vercel check clears, merge in order
(#175→#176→#177→#178→#179→#180→#181) rather than starting fresh.

**Separate finding (2026-08-21), still unaddressed as of 08-25: the
surviving deposit-scan cron is crediting 0 deposits per run.**
Production runtime logs show `/api/v1/deposits/scan` still firing
every ~2 minutes, but every Solana `getTransaction` call returns HTTP
429 (rate-limited). On-chain USDC deposits are very likely not being
credited right now — needs Dennis's attention on `SOLANA_RPC_URL`
capacity, independent of the Vercel plan question. Flagged with
increasing weight each night given the financial stakes; no
indication yet that Dennis has seen it.

**Two decisions have now gone a full week unanswered in `#nexus`**
(auto-merge-for-planning-PRs, open since 2026-08-09 — 16 days; Vercel
plan-vs-cron-cadence, open since 2026-08-21 — 4 days), across seven
consecutive nightly Slack summaries with zero replies since the
channel's first message (2026-06-28). The 2026-08-25 session is
escalating both plus the deposit-crediting finding outside the
routine Slack channel given the run of silence and the financial
stakes.

Health checks (`www.vdmnexus.com`, `verify.vdmnexus.com`,
`nexus.vdmnexus.com`) remain egress-blocked every night since
2026-07-31 (2026-08-13 unconfirmed) — 27 consecutive confirmed nights
as of 2026-08-25, still needing an allowlist decision from Dennis.

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
