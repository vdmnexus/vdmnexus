# Prompt 00 — Daily Review & Plan Loop

**Cadence:** 22:00 Spain time (Europe/Madrid) daily (scheduled Claude Code session).
**Branch:** the current session branch (e.g. `claude/slack-session-*`).
**Outcome:** the day's work reviewed, tomorrow's plan committed to
`planning/`, and a concise summary posted to `#nexus`.

The repo is the only shared memory between sessions, so the plan MUST be
committed.

---

## 0. Apply feedback from #nexus
- Read messages in the `#nexus` Slack channel (id `C0BDPTS89QS`) posted since
  the last run (use the most recent `planning/daily/` file's date; fall back to
  last 24h).
- Focus on messages from Dennis (dennis@vdmnexus.com) that are EXPLICIT
  instructions reacting to the previous daily update — e.g. "drop task X",
  "add Y", "do Z instead tomorrow", "reprioritise", or "update the business
  plan: ...".
- Apply with targeted edits (do not rewrite whole files):
  - Task / plan changes → `planning/NEXT.md` and the current
    `planning/daily/<date>.md` in this public `vdmnexus` repo.
  - Business-plan changes → `business-plan.md` at the root of the PRIVATE
    `vdmnexus/internal` repo, and ONLY when Dennis explicitly asks to change
    the business plan. Never edit it from general discussion or anything that
    isn't a clear instruction. If `business-plan.md` does not exist in
    `vdmnexus/internal` yet, create it first with these sections (headings
    only, brief seed text, content filled over time): Wedge / one-liner;
    Problem; Product; Market & competition; Go-to-market; Business model;
    Roadmap (pointer to CLAUDE.md); Regulatory / MiCA; Risks / kill-criteria;
    Traction / metrics; Open questions.
- NEVER write business-plan content into the public `vdmnexus` repo.
- If a request is ambiguous, do NOT guess — note it and ask in the step-5
  Slack summary instead of applying it.
- Record what you changed; surface it in the step-5 Slack summary
  ("Applied your changes: ...").

## 1. Gather

- Find the most recent file in `planning/daily/` to determine the
  last-run date (fall back to last 24h if none).
- Via the GitHub MCP tools on `vdmnexus/vdmnexus`: pull merged PRs, open
  PRs, and commits to `main` since that date. Read PR titles, bodies,
  changed files, and CI status.
- Read `STATUS.md` (in-flight branches) and the roadmap in `CLAUDE.md`
  (priorities + kill-criteria).
- Read `business-plan.md` from the private `vdmnexus/internal` repo for
  strategic context (if it exists).

## 2. Review

- Merged PRs: what shipped, does it match the roadmap, any follow-ups /
  regressions / TODOs left behind.
- Open PRs: status, blockers, what's needed to merge.
- Flag anything that contradicts the roadmap or trips a kill-criterion.

## 3. Plan tomorrow

- Pick the next highest-leverage roadmap item(s). Roadmap order in
  `CLAUDE.md` governs; speed-to-distribution beats feature work.
- Map each to the relevant `prompts/NN-*.md` file. If none exists, note
  that one should be written.
- Write a concrete, ordered build plan for tomorrow.

## 4. Persist (the repo is the only shared memory)

- Write `planning/daily/<YYYY-MM-DD>.md`: PRs reviewed, review notes,
  tomorrow's plan.
- Overwrite `planning/NEXT.md` with just tomorrow's plan (the rolling
  pointer the next session reads first).
- Update `STATUS.md` if branch states changed.
- Commit on the current branch (`chore(planning): daily review <date>`)
  and push. Skip the commit if there are no changes.
- Commit business-plan changes to the private `vdmnexus/internal` repo;
  commit plan/task changes to the public `vdmnexus` repo. Keep each in its
  own repo.

## 5. Notify Slack

- Post a concise summary to the `#nexus` Slack channel (id
  `C0BDPTS89QS`) via the Slack MCP tool.
- Format: header `Daily review <date>`, a bullet list of PRs shipped, a
  2-4 bullet plan for tomorrow, and a final line
  `full plan: planning/daily/<date>.md`.
- Keep it skimmable. No @-mentions unless something is blocked and needs
  Dennis.
- Plain text — avoid emoji (no ✅, checkmarks, or decorative icons). Use simple dashes for bullets. Status words like "merged" / "blocked" instead of emoji.
- If nothing shipped, still post a one-liner:
  `quiet day, no merges — tomorrow: <plan>`.

## Rules

- Read-only on code. The only writes are the `planning/` docs +
  `STATUS.md`.
- Never schedule broadcasts and never post outside `#nexus`.
- This session IS the model — do not route through the Nexus rail; just
  reason directly.
- Scheduled trigger uses UTC cron: `0 20 * * *` during CEST (summer,
  UTC+2) and `0 21 * * *` during CET (winter, UTC+1) — update the cron
  when DST changes so it stays at 22:00 local.
- The business plan lives ONLY in the private `vdmnexus/internal` repo
  (`business-plan.md`). Never commit business-plan content to the public
  `vdmnexus` repo.
- `business-plan.md` is changed ONLY on Dennis's explicit instruction —
  never inferred from discussion.
- Only Dennis's explicit instructions cause any file change in step 0;
  ambiguous requests get asked back in Slack, not applied.
- Keep Slack summaries plain and emoji-free.
