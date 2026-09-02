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
row) merged 2026-08-10; #167-#169 (2026-08-10 through 2026-08-12
daily reviews) all merged cleanly, no recovery needed.

**2026-08-13 gap.** A "Daily review 2026-08-13" summary was posted to
`#nexus` that night, but no matching PR, branch, or commit exists in
this repo. Nothing left to recover in-repo for 08-13 itself.

#170 (2026-08-14), #172 (2026-08-16), #173 (2026-08-17), and #174
(2026-08-18) each sat unmerged ~24h despite green CI and were
recovered by the following night's session — the ninth and tenth
occurrences of the green-CI-but-unmerged pattern overall (#142, #152,
#155, #163, #165, #166, #170, #172, #173, #174). #171 (2026-08-15)
merged cleanly. #174 was the last of this pattern observed; #175
onward hit a different, unrelated failure (below) before any of them
could reach this state.

**#175 onward — `Vercel – nexus: failure`, ongoing since
2026-08-18T20:13Z.** Diagnosed 2026-08-21 (in #177's review): `vdm-nexus`
is on the Vercel Hobby plan, which rejects `apps/nexus/vercel.json`'s
`*/2 * * * *` deposit-scan cron on any new build — a pre-build,
diff-independent platform failure, not the earlier stuck-despite-green
pattern. Production `nexus.vdmnexus.com` is unaffected (serving the
2026-08-17 build). Every planning PR since has hit the identical check
and none have been merged: #175 (08-19) through #188 (09-01) — fourteen
open PRs — plus tonight's #189, fifteen. Each night's session
re-verifies the check and the team plan fresh rather than trusting the
carry-forward. If the check ever clears, merge the backlog in strict
order (#175 → ... → #189) rather than starting fresh. Two decisions
remain open and unanswered in `#nexus` since 2026-08-21 (Vercel plan vs.
cron cadence) and 2026-08-09 (auto-merge for planning-only PRs).

**Deposit-scan cron — crediting 0 deposits per run, since 2026-08-21.**
Separate from the Vercel build blocker above: the surviving production
cron (still running on the last successful deploy) hits Solana
`getTransaction` HTTP 429 on every run and completes with `credited: 0`
every time. Reconfirmed directly against live runtime logs every night
since discovery, including 2026-09-02 (19:55-20:10 UTC window, still
429ing, still 0 credited). On-chain USDC deposits are very likely not
being credited to agent balances. Financial-stakes item, unaddressed in
`#nexus` 12 days running as of 2026-09-02.

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
