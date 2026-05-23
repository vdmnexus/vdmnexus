# langchain-vdm-nexus

> **Beta** — API stable, mainnet live. v1 ships at $NEXUS launch.

> [LangChain](https://python.langchain.com) integration for
> [VDM Nexus](https://vdmnexus.com) — signed-inference ChatModel that
> pays per call via x402 on Solana. No API keys, just an Ed25519
> keypair.

`ChatNexus` is a drop-in subclass of `langchain_core.language_models.chat_models.BaseChatModel`.
It runs the x402 v2 handshake transparently (probe → 402 → sign SPL
USDC transfer → paid retry) and exposes the resulting Signed Inference
Receipt and on-chain payment metadata on every response.

## Install

```bash
pip install langchain-vdm-nexus
```

Two runtime deps: `vdm-nexus` (≥ 0.2.0) and `langchain-core` (≥ 0.3).

## Use

```python
import os
from langchain_vdm_nexus import ChatNexus
from langchain_core.messages import HumanMessage

llm = ChatNexus(
    secret_key=os.environ["AGENT_SECRET_KEY"],   # base58 64-byte Ed25519
    endpoint="https://nexus.vdmnexus.com/api/v1",
    model="openai/gpt-4o-mini",
    network="solana:mainnet",                    # or "solana:devnet"
)

reply = llm.invoke([HumanMessage(content="Why Ed25519?")])
print(reply.content)
```

A real mainnet receipt produced by this exact call shape:
[`vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e`](https://vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e).

## Receipt access

The Signed Inference Receipt (SIR v2) and the x402 payment response
are attached to every `AIMessage`:

```python
reply = llm.invoke([HumanMessage(content="hello")])

receipt = reply.response_metadata["nexus_receipt"]
print("tx:        ", receipt["payment"]["tx_signature"])
print("paid:      ", receipt["payment"]["amount_usdc"], "USDC")
print("model:     ", receipt["model"])
print("hash:      ", receipt["response_hash"])

payment = reply.response_metadata["nexus_payment"]
print("settled at:", payment["txSignature"], "on", payment["network"])
```

Each receipt is cryptographically signed by the Nexus operator key and
can be verified independently — see
[verify.vdmnexus.com](https://verify.vdmnexus.com) or the
[`@vdm-nexus/x402`](https://www.npmjs.com/package/@vdm-nexus/x402)
TS verifier.

## Async

`ChatNexus` implements both `_generate` and `_agenerate`. Use
`ainvoke`, `abatch`, `astream` (single-chunk; see Streaming below)
as normal:

```python
reply = await llm.ainvoke([HumanMessage(content="hi")])
```

## Compatibility

LangChain's `BaseChatModel` is the substrate that LangGraph nodes and
CrewAI agents call into. `ChatNexus` works as-is in:

- **LangChain** chains (`llm | prompt | parser`).
- **LangGraph** — pass the model into any node that accepts a chat
  model. Receipts surface on the node's output state via
  `last_message.response_metadata["nexus_receipt"]`.
- **CrewAI** — use as the agent's `llm`. Every tool-call and
  reasoning step routes through Nexus and emits a receipt.

Native LangGraph and CrewAI sub-packages may follow if there's
adoption demand, but neither needs one — `ChatNexus` is sufficient.

## Streaming

Not implemented in `v0.1.0`. The upstream `/chat/completions` endpoint
does not emit SSE chunks today. Calls into `stream` / `astream` will
fall through to the default `BaseChatModel` behaviour: a single
chunk containing the full response. Native streaming will arrive
once the Nexus rail supports it.

## How payment works

Each `invoke` runs the [x402 v2](https://docs.vdmnexus.com) two-roundtrip
handshake:

1. POST `/chat/completions` — server replies `402` with an
   `X-Payment-Required` challenge declaring the price (USDC) and
   recipient.
2. Build a partially-signed SPL `TransferChecked` transaction (via
   `solders`) for that price, signed by your Ed25519 keypair.
3. POST again with `X-Payment: <base64>` — the server's facilitator
   co-signs as fee payer, broadcasts to Solana, runs inference, and
   returns the OpenAI body plus `X-Nexus-Receipt` and
   `X-Payment-Response` headers.

The agent's wallet is yours; Nexus never holds private keys.

## License

MIT. See [LICENSE](./LICENSE).

## Repo

Source lives in the [VDM Nexus monorepo](https://github.com/vdmnexus/vdmnexus)
under `packages/sdk-python-langchain`.
