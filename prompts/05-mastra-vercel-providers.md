# Prompt 05 — Mastra + Vercel AI SDK providers

**Roadmap item:** Phase 1 — Distribution, #5.
**Branch:** `claude/mastra-vercel-providers`.
**Outcome:** Two new npm packages, both demoed against mainnet.

---

## Pre-session checklist

1. Read `STATUS.md`. Add a row:
   `| claude/mastra-vercel-providers | Mastra + Vercel AI SDK providers | <today> | in_progress | — |`
2. Read `CLAUDE.md` "packages/x402 — @vdm-nexus/x402" section — the
   `X402Agent.payAndInfer` method is what these providers wrap.

## Prompt body

Goal: two TypeScript framework providers that let Mastra agents and
Vercel AI SDK apps call Nexus as their LLM with one import. Both
frameworks speak OpenAI-compatible `/chat/completions` natively — the
integration is ~30 lines each, mostly a custom-fetch wrapper that
performs the x402 handshake.

### Tasks

1. **Mastra** (`packages/mastra-provider`):
   - Read `mastra-ai/mastra` on GitHub. Find their custom-LLM-provider
     pattern.
   - Write `NexusProvider` that points at
     `https://nexus.vdmnexus.com/api/v1/chat/completions`.
   - Inject the x402 handshake into the fetch using
     `@vdm-nexus/x402`'s `X402Agent.payAndInfer` (or a thin fetch
     wrapper around it).
   - Hand back a standard Mastra LLM result; expose the SIR v2 receipt
     via metadata (`result.metadata.nexus_receipt`).
2. **Vercel AI SDK** (`packages/ai-sdk-provider`):
   - Use `createOpenAICompatible` with a custom fetch.
   - Same x402-handshake injection.
   - Same receipt pass-through via response metadata.

### For both packages

- README quickstart: 5 lines of code to install, instantiate, call,
  print the receipt.
- One working e2e demo against mainnet (small flat USDC cost is fine
  — log the receipt URL).
- README front-loads "your agent pays in USDC; here's how to fund the
  wallet" — point at `/playground` for the zero-friction path.

### Out of scope

- LangChain / LangGraph Python adapters (gated on Python SDK — prompt 01)
- ElizaOS / SendAI plugins (separate prompts)

### Deliverables

- `packages/mastra-provider/` + `packages/ai-sdk-provider/`
- Both published to npm under `@vdm-nexus/*` with `prepublishOnly tsc`
- README demos linking the mainnet receipt as proof

## Done criteria

1. PR open against `main` from `claude/mastra-vercel-providers`.
2. CI green.
3. Both packages published to npm.
4. `STATUS.md` row updated to `in_review`.
5. Build_log entry: *"Mastra + Vercel AI SDK providers shipped. Two
   one-import drops for OpenAI-compatible TS frameworks; full x402
   handshake handled internally; SIR v2 receipt exposed via response
   metadata."* Tags: `['distribution', 'mastra', 'vercel-ai-sdk']`.
6. Subscribe to PR activity.
