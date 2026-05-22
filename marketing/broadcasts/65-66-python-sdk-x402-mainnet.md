# Broadcast — PRs #65 + #66 — Python SDK signed inference on mainnet

**Type**: feat (combined: 0.2.0 ship + 0.2.1 x402 handshake fix)
**Linked PRs**: [#65](https://github.com/vdmnexus/vdmnexus/pull/65), [#66](https://github.com/vdmnexus/vdmnexus/pull/66)
**Drafted**: 2026-05-22 by Claude / Dennis
**Status**: in review

---

## X (Twitter)

```
Python agents can now sign and pay for inference on Solana mainnet.

pip install vdm-nexus — Ed25519 identity, x402 USDC per call, SIR v2 receipts. langchain-vdm-nexus drops the SDK into LangGraph, CrewAI, and LlamaIndex via BaseChatModel.

docs.vdmnexus.com
```

- Raw length: ~265 chars (incl. URL literal)
- X-counted length (URL = 23): ~270 / 280 ✓

---

## Farcaster

```
Python agents on Solana mainnet can now sign and pay for their own inference.

pip install vdm-nexus → Ed25519 identity + x402 USDC per call + signed inference receipts (SIR v2). langchain-vdm-nexus drops it into LangGraph, CrewAI, and LlamaIndex via BaseChatModel.

docs.vdmnexus.com
```

- Length: ~315 / 320 ✓

---

## Telegram

```markdown
**Python SDK now does signed inference on mainnet**

`vdm-nexus 0.2.1` is live on PyPI. Python agents hold their own Ed25519 keypair, pay per inference call in USDC on Solana mainnet via x402, and receive a Signed Inference Receipt (SIR v2) that any third party can verify cryptographically.

```python
from vdm_nexus import X402Agent

agent = X402Agent.generate()
res = await agent.pay_and_infer(
    "https://nexus.vdmnexus.com/api/v1",
    model="openai/gpt-4o-mini",
    messages=[{"role": "user", "content": "hello"}],
)
```

`langchain-vdm-nexus 0.1.0` exposes the same surface as a LangChain `BaseChatModel` — so it drops into **LangGraph nodes, CrewAI agents, and LlamaIndex** without any glue code. One install, three frameworks reachable.

Docs: docs.vdmnexus.com
Verify a receipt: verify.vdmnexus.com
```

- Length: ~720 chars (slightly over the 400-700 target, but the code block is the point and removing it loses the demo)

---

## LinkedIn

```
Python is the language most autonomous-agent infrastructure is built in. As of today, every Python agent can authenticate, pay for, and produce cryptographically verifiable inference receipts on Solana mainnet — without leaving its existing framework.

We shipped two PyPI packages:

vdm-nexus 0.2.1 — the core SDK. An autonomous agent holds its own Ed25519 keypair (no API keys, no managed accounts), pays per inference call in USDC over x402 on Solana mainnet, and receives a Signed Inference Receipt on every successful call. The receipt is hash-chained to the request and the response, signed by the inference operator with a published Ed25519 key, and references the on-chain settlement transaction. Any third party can verify it independently.

langchain-vdm-nexus 0.1.0 — a drop-in LangChain BaseChatModel. Because LangGraph nodes, CrewAI agents, and LlamaIndex all consume LangChain's chat-model interface, a single `pip install` adds verifiable, autonomously-paid inference to all three.

The use cases this unlocks:

— Audit trails for regulated industries: every model output cryptographically anchored to its inputs and to an on-chain settlement
— Autonomous agents that operate on their own budget, with no human in the credit-card loop
— Multi-agent systems where each agent's spend and output are independently verifiable by collaborators and auditors

Try it: docs.vdmnexus.com
Verify a receipt: verify.vdmnexus.com

#AIAgents #Solana #x402 #AgentInfrastructure #OnChainAI
```

- Length: ~1,540 chars (slightly over the 1,400 target — the regulated-industry framing is load-bearing for the LinkedIn audience; trim the use-cases bullets if you want to land closer to target)

---

## Approved for scheduling

| Platform | Status | Scheduled for | Postiz ID |
|---|---|---|---|
| X | **approved, awaiting manual schedule** | 2026-05-23 09:00 CET (07:00 UTC) | _Postiz CLI not installed locally_ |
| Farcaster | skipped | — | — |
| Telegram | skipped | — | — |
| LinkedIn | skipped | — | — |

### Handoff instructions

Postiz CLI is not installed in this environment (`postiz: command not found`, no `POSTIZ_API_KEY` in shell). Two paths to actually publish:

1. **Postiz web UI** — paste the X draft above into postiz.com, schedule for `2026-05-23T07:00:00Z` (09:00 CET) against the `@vdmnexus` X integration. Update this file's Postiz ID column afterward.
2. **Install Postiz CLI** for next time:
   ```bash
   npm install -g postiz
   export POSTIZ_API_KEY=<from postiz.com → settings → API>
   # Then in a future Claude session, /ship-broadcast will fire end-to-end.
   ```

Either way, this draft file is the source of record — drop the Postiz post ID into the table once scheduled.
