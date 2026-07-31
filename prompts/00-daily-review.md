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

## Tracked objects (priority order — retargeted 2026-07-31)

This loop's job is to track these four objects, in this order. The
Phase-1 distribution roadmap in `CLAUDE.md` (locked 2026-05-22) no
longer drives the nightly plan — it stays as background context and its
kill-criteria still apply, but the nightly plan is built from this list.

1. **Launch readiness — `marketing/token-launch-checklist.md`.** The
   $NEXUS launch, re-venued 2026-07-30 to a Uniswap v4 $NEXUS/USDC pool
   with a fee-burn hook on Robinhood Chain. Each night: which checklist
   items moved, which are actionable next, and the standing flag that
   the T-14 / T-48h / T-0 operational steps still describe Solana
   tooling and need a rewrite pass before any date is set. Surface the
   1-3 most actionable unchecked items, not the whole list.
2. **Rienda milestones M1-M5.** M1 vault + policy engine → M2 paper
   agent + router → M3 compute budget + x402 paymaster → M4 endurance
   run → M5 external audit + legal gate. The contracts live in a
   separate PRIVATE repo this loop cannot read — track ONLY the status
   Dennis reports (via `#nexus` or planning notes). Record last-known
   status + the date it was reported. Never advance or complete a
   milestone without an explicit report from Dennis; if status is
   older than 7 days, ask for an update in the step-5 summary.
3. **Site / API health — read-only checks.** Each run, verify and
   report pass/fail:
   - `POST https://www.vdmnexus.com/api/playground/inference` with a
     trivial prompt returns JSON (one call max per run; a structured
     JSON error still counts as "endpoint alive", a non-JSON 5xx or
     timeout does not).
   - `https://verify.vdmnexus.com` responds.
   - `https://nexus.vdmnexus.com/api/health` returns ok.
   HTTP checks only — no deploys, no config changes, no paid x402
   calls. A failing check is a blocker line at the top of the summary.
4. **Dennis-blocked standing items.** Keep nagging, but verify state
   via GitHub every run before repeating a nag, and demote items that
   resolved. As of 2026-07-31: PRs #149 + #150 are MERGED (two-layer
   site, disclosures/security, nav IA, VOICE.md + copy-lint) — done,
   stop tracking. #114 (WC26 site) is still open, but #150 removed the
   wc26 pages from the marketing site — reframe as a decision request
   ("close #114?"), not a build reminder. #106 (cards-v1 spec):
   merge-or-close decision. #95 (Polymarket agent): blocked on Spanish
   counsel. **Legal memo (was "compliance one-pager / roadmap item 7",
   31+ days stale): reframed to status-tracking — "engage law firm
   memo — email drafted, awaiting Dennis send". Track send/response
   status; do not re-plan it as a nightly build task.** The May
   manual-submission backlog (discovery listings, Sepolia mint,
   AgentKit PR, SendAI plugin) stays Dennis-blocked — one summary line
   at most, below launch-readiness items.

## 1. Gather

- Find the most recent file in `planning/daily/` to determine the
  last-run date (fall back to last 24h if none).
- Via the GitHub MCP tools on `vdmnexus/vdmnexus`: pull merged PRs, open
  PRs, and commits to `main` since that date. Read PR titles, bodies,
  changed files, and CI status.
- Read `STATUS.md` (in-flight branches),
  `marketing/token-launch-checklist.md` (tracked object 1), and the
  kill-criteria in `CLAUDE.md`.
- Read `business-plan.md` from the private `vdmnexus/internal` repo for
  strategic context (if it exists).
- Run the read-only health checks (tracked object 3).

## 2. Review

- Merged PRs: what shipped, does it advance a tracked object, any
  follow-ups / regressions / TODOs left behind.
- Open PRs: status, blockers, what's needed to merge.
- Flag anything that trips a kill-criterion (`CLAUDE.md` +
  `marketing/token-launch-checklist.md` both have kill-criteria lists).

## 3. Plan tomorrow

- Build the plan from the tracked objects, in their priority order:
  launch-readiness actions first, then Rienda status asks, then health
  failures, then standing-blocked reminders.
- Map each planned action to a `prompts/NN-*.md` file where one exists.
  If none exists, note that one should be written — do not write it in
  this session.
- Write a concrete, ordered plan. Small and real beats long and stale:
  if an item has appeared unchanged for 7+ nights, escalate it to a
  direct question in the step-5 summary instead of repeating it.

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
  `STATUS.md`. This loop does not open code PRs — that expansion was
  considered and is not approved; permissions stay as they are.
- The private Rienda contracts repo is out of bounds — the loop tracks
  reported status only, it never reads or clones that repo.
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
