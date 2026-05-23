# vdm-nexus

> **Beta** — API stable, mainnet live. v1 ships at $NEXUS launch.

> Python SDK for [VDM Nexus](https://vdmnexus.com) — autonomous AI agents
> that authenticate and pay for compute with a Solana keypair. No API keys.

Mirror of [`@vdm-nexus/sdk`](https://www.npmjs.com/package/@vdm-nexus/sdk)
(TypeScript). Same identity, same wire format, same receipt shape.

## Install

```bash
pip install vdm-nexus
```

Four runtime deps: `pynacl`, `base58`, `httpx`, `solders`.

## Use

```python
import asyncio
from vdm_nexus import Agent

async def main() -> None:
    # Generate a fresh agent — or load from a secret key string.
    agent = Agent.generate()
    # agent = Agent.from_base58(os.environ["AGENT_SECRET_KEY"])

    print("agent pubkey:", agent.pubkey)

    reply = await agent.inference(
        "https://nexus.vdmnexus.com/api/v1",
        prompt="Explain Ed25519 signatures in one sentence.",
        task_type="fast",  # "fast" | "reasoning" | "general"
    )

    print(reply.get("result"))
    if "receipt" in reply:
        print("cost:", reply["receipt"]["cost_usdc"], "USDC")
        print("balance:", reply["receipt"]["balance_remaining"], "USDC")


asyncio.run(main())
```

## x402 — pay per call

`v0.2` adds `X402Agent`, which speaks the [x402 v2 protocol](https://docs.vdmnexus.com)
against `/v1/chat/completions`. Same Ed25519 identity, settles in USDC
on Solana per request. Returns the standard OpenAI chat-completion body
plus a parsed Signed Inference Receipt.

```python
import asyncio
import os
from vdm_nexus import X402Agent

async def main() -> None:
    agent = X402Agent.from_base58(os.environ["AGENT_SECRET_KEY"])

    result = await agent.pay_and_infer(
        "https://nexus.vdmnexus.com/api/v1",
        model="openai/gpt-4o-mini",
        messages=[{"role": "user", "content": "Why Ed25519?"}],
        network="solana:mainnet",  # or "solana:devnet"
    )

    print(result.openai["choices"][0]["message"]["content"])
    print("tx:", result.receipt["payment"]["tx_signature"])
    print("paid:", result.receipt["payment"]["amount_usdc"], "USDC")


asyncio.run(main())
```

A real mainnet receipt from this exact flow:
[`vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e`](https://vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e).

Under the hood, `pay_and_infer` runs the x402 two-roundtrip handshake:

  1. POST the request body — server replies `402` with an
     `X-Payment-Required` challenge.
  2. Build a partially-signed SPL USDC `TransferChecked` transaction
     (via `solders`) for the declared `payTo`, encode as base64.
  3. POST again with `X-Payment: <base64>` — server settles via its
     facilitator, runs inference, returns the OpenAI body plus
     `X-Nexus-Receipt` and `X-Payment-Response` headers.

The agent's wallet is theirs; Nexus never holds private keys.

## How it works

Every request is signed with the agent's Ed25519 secret key. The Nexus
server verifies the signature against the agent's public key over the raw
body bytes, checks the nonce hasn't been reused, checks the timestamp is
fresh, debits the agent's USDC balance, and returns the completion plus a
tamper-proof receipt.

There are no API keys to rotate, leak, or scope. The public key is the
identity.

## API

### `Agent.generate() -> Agent`

Generate a fresh Ed25519 keypair.

### `Agent.from_base58(secret_key_base58: str) -> Agent`

Load an agent from a base58-encoded 64-byte secret key.

### `agent.pubkey: str`

The agent's base58-encoded public key. This is the identity.

### `agent.secret_key_base58: str`

The agent's full base58-encoded secret key. **Treat as a password.**
Never log this or commit it to source control.

### `await agent.inference(endpoint, *, prompt, task_type=..., max_cost_usdc=..., auto_grant=True) -> dict`

Make a signed inference request to a Nexus endpoint. Returns a dict
mirroring the JSON response — `{"ok", "result"?, "receipt"?, "error"?,
"detail"?}` — with the receipt fields matching SIR v2.

### `await agent.grant(endpoint) -> dict`

Request a sponsored USDC grant for this agent's pubkey. One grant per
pubkey ever. Auto-called by `inference()` when the balance is zero;
pass `auto_grant=False` to opt out.

### `agent.sign_body(body: bytes) -> str`

Lower-level: sign arbitrary body bytes and return the base58 signature.
Useful when building your own request flow. Sign the EXACT bytes you
will send — the server re-derives the signature against the bytes it
receives.

## Scope

- **v0.1**: the `Agent` class. Signed inference against
  `/v1/inference`. Auto-grant on first call.
- **v0.2** (this release): adds `X402Agent` — pay-per-call inference
  against `/v1/chat/completions` with on-chain USDC settlement on
  Solana mainnet or devnet.
- **v0.3**: `verify_receipt` — port of the five-check verifier from
  [`@vdm-nexus/x402`](https://www.npmjs.com/package/@vdm-nexus/x402).
  Also Base (EVM) support in `pay_and_infer`.
- **Separate package** (`vdm-nexus-wallet`): on-chain wallet
  operations (deposits, transfers). Pulls in heavier Solana
  dependencies; kept out of the core SDK so the dependency surface
  stays small.

## Framework integrations

- [`langchain-vdm-nexus`](https://pypi.org/project/langchain-vdm-nexus/) —
  drop-in `ChatNexus` model for LangChain (and by extension LangGraph,
  CrewAI, and any framework built on `BaseChatModel`).

## Repo

Source lives in the [monorepo](https://github.com/vdmnexus/vdmnexus)
under `packages/sdk-python`.

## License

MIT.
