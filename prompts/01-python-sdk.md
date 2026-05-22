# Prompt 01 — Python SDK scaffold

**Roadmap item:** Phase 1 — Distribution, #1.
**Branch:** `claude/python-sdk`.
**Outcome:** PyPI package `vdm-nexus` v0.1.0 with the Agent class
ported from `packages/sdk/`.

---

## Pre-session checklist

1. Read `STATUS.md`. If a row for `claude/python-sdk` exists, stop and
   notify the user. Otherwise add a row:
   `| claude/python-sdk | Port @vdm-nexus/sdk Agent to Python | <today> | in_progress | — |`
2. Read `CLAUDE.md` sections: "Built vs not built", "Conventions",
   and "packages/sdk — @vdm-nexus/sdk".
3. Read `packages/sdk/src/*.ts` before writing any Python. The
   signature-over-raw-body-bytes semantics MUST match exactly or the
   server rejects the call.

## Prompt body

You are working in the VDM Nexus monorepo (Turbo + pnpm). Goal: stand up
`packages/sdk-python` — the Python equivalent of `@vdm-nexus/sdk`. This
is the single biggest unlock on the roadmap; every Python framework
adapter (LangChain, LangGraph, CrewAI, OpenAI Agents SDK, Google ADK,
Fetch.ai uAgents) is blocked on it. PyPI name: `vdm-nexus` (PyPI doesn't
allow scopes).

### Scope — v0.1.0

1. Port the `Agent` class from `packages/sdk/src/agent.ts` to Python.
   Mirror the TS API exactly:
   - `Agent.generate()`
   - `Agent.from_base58(secret_key)`
   - `.pubkey` (property)
   - `.secret_key_base58` (property)
   - `.inference(endpoint, opts)` (async)
   - `.sign_body(body)` (low-level)
2. Two runtime deps only: `pynacl`, `base58`. No `solana-py` yet
   (that's v0.2).
3. **Critical signing semantic**: the Ed25519 signature is over the
   EXACT bytes of the JSON-serialized body the HTTP request carries.
   Read `packages/sdk/src/sign.ts` first — the server compares the
   signature against the exact string the client `JSON.stringify`-d.
   The Python client must serialize once and use those exact bytes for
   both signing and the HTTP body. Do not let `httpx` or `requests`
   re-serialize.
4. Match the inference response shape exactly:
   `{ ok, result?, receipt?, error?, detail? }` with receipt fields
   matching SIR v2 (see `CLAUDE.md`).

### Out of scope for v0.1.0

- x402 client → v0.2 (adds `solana-py` or `anchorpy` dep)
- `verify_receipt` → v0.3 (port from `packages/x402`)
- Wallet / deposit → separate package later (`vdm-nexus-wallet`)

### Deliverables

- `packages/sdk-python/`
  - `pyproject.toml` (poetry or hatch; pick the simpler one)
  - `README.md` — mirrors `packages/sdk/README.md` quickstart
  - `src/vdm_nexus/__init__.py`
  - `src/vdm_nexus/agent.py`
  - `src/vdm_nexus/sign.py`
  - `tests/test_agent.py` — one passing pytest that round-trips
    generate → sign → mocked POST → parses receipt
- Source ≤ 250 LOC. No abstractions, no config knobs, no framework
  integrations.

## Done criteria

This task is complete when ALL of the following are true:

1. PR open against `main` from `claude/python-sdk`.
2. CI green (build + tests pass on the new package).
3. `STATUS.md` row updated to `in_review` (with the PR link).
4. Build_log entry inserted into Supabase:
   - Table: `public.build_log`
   - `entry` ≤ 280 chars, e.g. *"Python SDK scaffold landed — Agent
     class ported from @vdm-nexus/sdk, two runtime deps (pynacl + base58),
     one round-trip test green. PyPI publish in v0.2 after x402 client
     port."*
   - `tags`: `['sdk', 'python', 'distribution']`
5. Subscribe to PR activity via `mcp__github__subscribe_pr_activity`
   so you autofix CI failures and respond to review comments without
   the user re-spinning the session.

**Don't mark complete before all five.**
