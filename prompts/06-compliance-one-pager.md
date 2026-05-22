# Prompt 06 — AI Act / NIST / OWASP compliance one-pager

**Roadmap item:** Phase 1 — Distribution, #7.
**Branch:** `claude/compliance-one-pager`.
**Outcome:** Hosted compliance one-pager + cover summary for cold
outreach.

---

## Pre-session checklist

1. Read `STATUS.md`. Add a row:
   `| claude/compliance-one-pager | SIR v2 ↔ AI Act / NIST / OWASP mapping | <today> | in_progress | — |`
2. Read `CLAUDE.md` MiCA red-line section + "Built" SIR v2 description.

## Prompt body

Goal: a 1–2 page document mapping SIR v2 receipt fields to the
audit-log requirements regulated buyers need to satisfy. Enterprise
GRC sales asset — the document a compliance officer at a Spanish
fintech / EU bank / EU government can hand to their auditor.

### Standards to map against

1. **EU AI Act Article 12** — automatic logging requirement for
   high-risk AI systems, ≥6-month retention, append-only,
   tamper-evident.
2. **NIST AI Agent Standards Initiative** (Feb 2026) — comprehensive
   immutable audit logs for agentic systems.
3. **OWASP Top 10 for Agentic Applications** (Dec 2025) — LLM06
   (excessive agency), LLM08 (improper output), LLM10 (overreliance).
4. **ISO 42001** — AI management systems, logging clauses.

### Mapping table

For each requirement, list the SIR v2 field(s) that satisfy it
(`prompt_hash`, `response_hash`, `nexus_signature`, `agent_pubkey`,
`payment.tx_signature`, `inference_id`, `timestamp`). Be explicit
about what SIR v2 does NOT satisfy (retention policy, access controls,
integrity monitoring — those are operational, not protocol).

### Position vs hash-chained log vendors

Atlan, Galileo, Credo AI, Holistic AI, Langfuse, LangSmith all ship
append-only hash chains. The differentiator: SIR v2 is
cryptographically signed per-call and re-verifiable independently by a
regulator or counterparty. Hash-chained logs still require trusting the
operator's logging pipeline.

### Tone

Compliance officer / auditor audience. No crypto jargon. No "trust the
math" rhetoric. Cite primary sources:
- EUR-Lex for the AI Act
- NIST CSRC for the NIST initiative
- OWASP for the agentic top 10
- ISO for 42001

### Deliverables

- `apps/docs/.../compliance/eu-ai-act.mdx` — the markdown one-pager
- A PDF render via the docs site if a pipeline exists, else the `.md`
  is enough
- `outreach/compliance-cover.md` — a 1-paragraph cover summary
  suitable for cold outreach to GRC buyers (NOT a marketing tagline; a
  professional intro paragraph)

### Out of scope

- ANY legal claims. This is a *technical mapping* artifact, not a
  legal opinion. Flag clearly in the doc that the Spanish firm MiCA
  memo (roadmap item 11) is a separate workstream.

## Done criteria

1. PR open against `main` from `claude/compliance-one-pager`.
2. CI green.
3. `STATUS.md` row updated to `in_review`.
4. Build_log entry: *"Compliance one-pager live at
   docs.vdmnexus.com/compliance/eu-ai-act. Maps SIR v2 → AI Act Art 12
   + NIST + OWASP + ISO 42001. GRC sales asset for EU enterprise
   pipeline."* Tags: `['compliance', 'eu-ai-act', 'distribution']`.
5. Subscribe to PR activity.
