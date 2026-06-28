# Planning

Shared memory between scheduled Claude Code sessions. The repo is the
only state that survives across sessions, so plans live here, committed.

## Layout

- `daily/<YYYY-MM-DD>.md` — per-day archive: PRs reviewed, review notes,
  and the plan written for the following day. Append-only history.
- `NEXT.md` — rolling pointer to tomorrow's plan. Overwritten in full by
  each run; the next session reads this first.

Both files are written by `prompts/00-daily-review.md`, the end-of-day
review-and-plan loop. Treat them as machine-maintained; edit by hand only
to correct a run.
