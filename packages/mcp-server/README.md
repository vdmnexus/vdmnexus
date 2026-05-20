# @vdm-nexus/mcp

> MCP server for [VDM Nexus](https://vdmnexus.com) — drop signed inference
> into Claude Desktop, Cursor, or any [Model Context Protocol](https://modelcontextprotocol.io)
> client. Two tools: `signed_inference` and `verify_receipt`.

[![npm](https://img.shields.io/npm/v/@vdm-nexus/mcp.svg)](https://www.npmjs.com/package/@vdm-nexus/mcp)
[![license](https://img.shields.io/npm/l/@vdm-nexus/mcp.svg)](./LICENSE)

## What it does

This package ships an MCP server that an LLM client can spawn over stdio.
It exposes two tools:

- **`signed_inference`** — calls the Nexus API and returns the model output
  plus a Signed Inference Receipt (SIR v2). Two settlement modes:
  - `prepaid` — debits an off-chain credit ledger via `/v1/inference`.
  - `x402` — pays per call with a Solana USDC transfer via
    `/v1/chat/completions`.
- **`verify_receipt`** — runs the five-check verification on any SIR v2
  receipt (prompt hash, response hash, operator signature, on-chain USDC
  transfer, payer match). Works with no agent secret set.

See the [SIR v2 spec](https://docs.vdmnexus.com/docs/spec/sir-v2) for the
receipt format.

## Install

```bash
npm install -g @vdm-nexus/mcp
# or run on demand:
npx @vdm-nexus/mcp
```

## Configure

The server is configured entirely through environment variables.

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `NEXUS_AGENT_SECRET_KEY` | yes¹ | — | base58-encoded 64-byte Ed25519 secret. Generate one with `@vdm-nexus/sdk`'s `Agent.generate().secretKeyBase58`. Treat as a password. |
| `NEXUS_ENDPOINT` | no | `https://nexus.vdmnexus.com/api/v1` | Nexus API base, up to `/api/v1`. |
| `NEXUS_PAYMENT_MODE` | no | `prepaid` | `prepaid` or `x402`. Per-call `mode` arg overrides. |
| `NEXUS_DEFAULT_MODEL` | no | `openai/gpt-4o-mini` | Model used in x402 mode when the call omits `model`. |
| `NEXUS_OPERATOR_KEY` | no | (fetched from endpoint) | Override the operator Ed25519 pubkey used by `verify_receipt`. |
| `NEXUS_SOLANA_RPC_URL` | no | public devnet / mainnet | Override the Solana RPC used for the on-chain check. Use a fast provider (Helius, Triton, QuickNode) to skip retry waits. |

¹ Required only for `signed_inference`. `verify_receipt` works without it,
so you can use this server as a pure receipt auditor.

## Wire into Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "vdm-nexus": {
      "command": "npx",
      "args": ["-y", "@vdm-nexus/mcp"],
      "env": {
        "NEXUS_AGENT_SECRET_KEY": "your_base58_secret_here",
        "NEXUS_PAYMENT_MODE": "prepaid"
      }
    }
  }
}
```

Restart Claude Desktop. The `signed_inference` and `verify_receipt` tools
will appear in the tools menu.

## Wire into Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vdm-nexus": {
      "command": "npx",
      "args": ["-y", "@vdm-nexus/mcp"],
      "env": {
        "NEXUS_AGENT_SECRET_KEY": "your_base58_secret_here",
        "NEXUS_PAYMENT_MODE": "x402"
      }
    }
  }
}
```

Restart Cursor — `signed_inference` and `verify_receipt` show up in the
agent's tool list.

## Tool reference

### `signed_inference`

```ts
{
  prompt: string;            // required
  model?: string;            // OpenRouter slug, e.g. "openai/gpt-4o-mini"
  max_cost_usdc?: number;    // prepaid mode hint
  task_type?: "fast" | "reasoning" | "general"; // prepaid mode routing hint
  mode?: "prepaid" | "x402"; // overrides server default
}
```

Returns:

```ts
// prepaid
{
  mode: "prepaid",
  agent_pubkey: string,
  result: string,
  receipt: SirPrepaid,
}

// x402
{
  mode: "x402",
  agent_pubkey: string,
  result: string,
  openai: OpenAIChatCompletion,
  receipt: SirX402,
  payment: { status: "settled", txSignature, network },
}
```

### `verify_receipt`

```ts
{
  receipt: NexusReceipt,          // SIR v2 receipt
  prompt: string | ChatMessage[], // string for prepaid, array for x402
  response: string | OpenAIChatCompletion,
}
```

Returns the five-check verification result from `@vdm-nexus/x402`:

```ts
{
  ok: boolean,
  checks: {
    prompt_hash_ok: boolean,
    response_hash_ok: boolean,
    nexus_signature_ok: boolean,
    payment_on_chain_ok: boolean, // vacuously true for prepaid
    payer_matches: boolean,       // vacuously true for prepaid
  }
}
```

## Debugging

The official [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
is the easiest way to drive the server by hand:

```bash
npx @modelcontextprotocol/inspector npx @vdm-nexus/mcp
```

The server logs to stderr — stdout is reserved for the MCP wire. If a tool
call fails, the response will come back with `isError: true` and a JSON
body describing what went wrong.

## Status

Devnet only. Mainnet flips when the upstream Nexus API does — track the
[roadmap](https://vdmnexus.com/roadmap).

## Repo

Source lives in the [monorepo](https://github.com/vdmnexus/vdmnexus) under
`packages/mcp-server`.

## License

MIT — see [LICENSE](./LICENSE).
