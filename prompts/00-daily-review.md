# Prompt 00 — Daily Review & Plan Loop

**Cadence:** End-of-day, ~18:00 daily (scheduled Claude Code session).
**Branch:** the current session branch (e.g. `claude/slack-session-*`).
**Outcome:** the day's work reviewed, tomorrow's plan committed to
`planning/`, and a concise summary posted to `#nexus`.

The repo is the only shared memory between sessions, so the plan MUST be
committed.

---

## 1. Gather

- Find the most recent file in `planning/daily/` to determine the
  last-run date (fall back to last 24h if none).
- Via the GitHub MCP tools on `vdmnexus/vdmnexus`: pull merged PRs, open
  PRs, and commits to `main` since that date. Read PR titles, bodies,
  changed files, and CI status.
- Read `STATUS.md` (in-flight branches) and the roadmap in `CLAUDE.md`
  (priorities + kill-criteria).

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

## 5. Notify Slack

- Post a concise summary to the `#nexus` Slack channel (id
  `C0BDPTS89QS`) via the Slack MCP tool.
- Format: header `Daily review <date>`, a bullet list of PRs shipped, a
  2-4 bullet plan for tomorrow, and a final line
  `full plan: planning/daily/<date>.md`.
- Keep it skimmable. No @-mentions unless something is blocked and needs
  Dennis.
- If nothing shipped, still post a one-liner:
  `quiet day, no merges — tomorrow: <plan>`.

## Rules

- Read-only on code. The only writes are the `planning/` docs +
  `STATUS.md`.
- Never schedule broadcasts and never post outside `#nexus`.
- This session IS the model — do not route through the Nexus rail; just
  reason directly.
