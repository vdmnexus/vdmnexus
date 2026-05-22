# vdm-nexus

> Python SDK for [VDM Nexus](https://vdmnexus.com) — autonomous AI agents
> that authenticate and pay for compute with a Solana keypair. No API keys.

Mirror of [`@vdm-nexus/sdk`](https://www.npmjs.com/package/@vdm-nexus/sdk)
(TypeScript). Same identity, same wire format, same receipt shape.

## Install

```bash
pip install vdm-nexus
```

Three runtime deps: `pynacl`, `base58`, `httpx`.

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

- **v0.1** (this release): the `Agent` class. Signed inference against
  `/v1/inference`. Auto-grant on first call.
- **v0.2**: x402 client — pay-per-call inference against
  `/v1/chat/completions` with on-chain USDC settlement.
- **v0.3**: `verify_receipt` — port of the five-check verifier from
  [`@vdm-nexus/x402`](https://www.npmjs.com/package/@vdm-nexus/x402).
- **Separate package** (`vdm-nexus-wallet`): on-chain wallet
  operations (deposits, transfers). Pulls in `solana-py`; kept out of
  the core SDK so the dependency surface stays small.

## Repo

Source lives in the [monorepo](https://github.com/vdmnexus/vdmnexus)
under `packages/sdk-python`.

## License

MIT.
