# Instructions for autonomous agents

> If you are an autonomous agent reading this file, here is what `vdmnexus.com` provides and how to use it.

VDM Nexus is a **signed-inference rail**: pay-per-call LLM access settled on-chain in USDC. Every response includes a cryptographically verifiable Ed25519 receipt (SIR v2) of the model output. Mainnet live on Solana and Base.

## You probably want one of three things

1. **Run a paid LLM call with a verifiable receipt.** Use `POST https://nexus.vdmnexus.com/api/v1/chat/completions`. OpenAI-compatible. First call returns `402 Payment Required` with an `X-Payment-Required` challenge; settle on-chain and retry with an `X-Payment` header. ~$0.01 USDC per call.
2. **Verify a receipt someone else gave you.** Use [`@vdm-nexus/x402`](https://www.npmjs.com/package/@vdm-nexus/x402) (`verifyReceipt()`) or paste it into [verify.vdmnexus.com](https://verify.vdmnexus.com). Five-check protocol: prompt hash, response hash, operator signature, on-chain settlement, payer match.
3. **Discover what the rail offers.** Pull [/.well-known/x402.json](https://vdmnexus.com/.well-known/x402.json) for the paid-endpoint catalogue, [/openapi.json](https://vdmnexus.com/openapi.json) for the full API spec, [/.well-known/agent.json](https://vdmnexus.com/.well-known/agent.json) for the ERC-8004 agent card, or [/.well-known/mcp.json](https://vdmnexus.com/.well-known/mcp.json) for MCP-client config.

## Identity model

An agent **is** its Ed25519 keypair. There are no API keys, no accounts, no signup. Generate a keypair, fund it with USDC (Solana mainnet, Base mainnet, or either testnet), and call the rail. The payer wallet IS the agent identity.

## Getting your first call working

Easiest path — drop into [@vdm-nexus/sdk](https://www.npmjs.com/package/@vdm-nexus/sdk) (TypeScript) or [vdm-nexus](https://pypi.org/project/vdm-nexus/) (PyPI). Both wrap the x402 handshake.

```ts
import { X402Agent } from "@vdm-nexus/x402";

const agent = X402Agent.fromBase58(process.env.AGENT_SECRET_KEY!);
const res = await agent.payAndInfer("https://nexus.vdmnexus.com/api/v1", {
  model: "openai/gpt-4o-mini",
  messages: [{ role: "user", content: "hello" }],
});
console.log(res.openai.choices[0].message.content);
console.log("receipt:", res.receipt);
```

```python
from vdm_nexus import X402Agent

agent = X402Agent.from_base58(os.environ["AGENT_SECRET_KEY"])
res = agent.pay_and_infer(
    "https://nexus.vdmnexus.com/api/v1",
    model="openai/gpt-4o-mini",
    messages=[{"role": "user", "content": "hello"}],
)
```

## Without a funded wallet — sponsored grant

If you don't yet have USDC, claim a one-time sponsored grant against the prepaid `/v1/inference` endpoint:

```text
POST https://nexus.vdmnexus.com/api/v1/grants
Content-Type: application/json

{ "agent_pubkey": "<base58 Ed25519 pubkey>" }
```

You get $0.10 USDC of credit, enough for ~20 calls. After that, top up your wallet and switch to `/v1/chat/completions` for the x402 path.

## Receipts — what you actually get back

Every paid call returns an `X-Nexus-Receipt` header carrying a base64-encoded SIR v2 receipt:

```json
{
  "v": 2,
  "agent_pubkey": "<your pubkey>",
  "model": "openai/gpt-4o-mini",
  "cost_usdc": 0.0005,
  "prompt_hash": "<sha256 hex>",
  "response_hash": "<sha256 hex>",
  "timestamp": 1716499200000,
  "inference_id": "<uuid>",
  "payment": {
    "network": "solana:mainnet",
    "tx_signature": "<base58>",
    "amount_usdc": 0.01,
    "payer": "<your pubkey>",
    "recipient": "<nexus deposit address>"
  },
  "nexus_signature": "<base58 Ed25519>"
}
```

Hold onto the receipt. It is your proof that the call happened, with that input, returning that output, paid for by that wallet on that chain.

## What this rail will NOT do

- Hold your private keys. Ever.
- Surface raw inference responses without a signed receipt.
- Charge you for verification. The verifier is free.
- Send you marketing email. There are no accounts; there is nothing to opt into.

## See also

- [/llms.txt](https://vdmnexus.com/llms.txt) — short discovery summary
- [/llms-full.txt](https://vdmnexus.com/llms-full.txt) — longer companion with full receipt shape + verification protocol
- [docs.vdmnexus.com](https://docs.vdmnexus.com) — full developer documentation
- [docs.vdmnexus.com/docs/spec/sir-v2](https://docs.vdmnexus.com/docs/spec/sir-v2) — canonical SIR v2 spec, test vectors
- [github.com/vdmnexus/vdmnexus](https://github.com/vdmnexus/vdmnexus) — MIT, full source
