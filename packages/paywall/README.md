# @vdm-nexus/paywall

**Paywall + Proofs.** One line of code gates your API with
[x402](https://github.com/coinbase/x402) — and every paid call hands the
caller a signed Ed25519 receipt of exactly what your handler returned.

```bash
pnpm add @vdm-nexus/paywall
```

```ts
import express from "express";
import { expressPaywall } from "@vdm-nexus/paywall/express";

const app = express();
app.use(express.json());

app.post("/agent",
  expressPaywall({
    amount: 0.01,
    recipient: process.env.WALLET!,
    network: "solana-devnet",
    operatorSecretKey: process.env.OPERATOR_KEY!,    // 64-byte tweetnacl secretKey, base58
    facilitator: { mode: "http", url: "https://nexus.vdmnexus.com/x402" },
    onPaid: async ({ body, payer }) => {
      const prompt = (body as { prompt: string }).prompt;
      const reply  = await myLLM(prompt);
      return {
        response: { reply },
        promptForHash: prompt,
        responseForHash: reply,
        model: "my-app/v1",
      };
    },
  })
);
```

Hono and Next.js work the same way — `import { honoPaywall } from "@vdm-nexus/paywall/hono"` or `nextPaywall` from `/next`.

## What you get over a plain x402 paywall

| | `@vdm-nexus/paywall` | Plain x402 middleware |
|---|---|---|
| 402 challenge + verify + settle | ✓ | ✓ |
| Ed25519 receipt of the response | ✓ | — |
| Loop detection hook | ✓ | — |
| Per-call spend cap (fail-closed) | ✓ | — |
| $VDM discount / cashback / staking hooks | ✓ | — |
| Solana + Base | ✓ (Solana today) | varies |

## The receipt

Every successful response carries an `X-Nexus-Receipt` header — a base64'd v2
[Signed Inference Receipt](https://docs.vdmnexus.com/docs/spec/sir-v2) that
binds the payer wallet, the on-chain tx, your model identifier, and SHA-256
hashes of the prompt + response.

```json
{
  "v": 2,
  "agent_pubkey": "GqYU…",
  "upstream": "paywall",
  "model": "my-app/v1",
  "cost_usdc": 0.01,
  "prompt_hash": "…",
  "response_hash": "…",
  "timestamp": 1718294781000,
  "inference_id": null,
  "points_total": 0,
  "payment": {
    "scheme": "x402",
    "amount_usdc": 0.01,
    "tx_signature": "5xK…",
    "network": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
    "pay_to": "GqYU…"
  },
  "nexus_signature": "3uvW…"
}
```

Callers verify it end-to-end with `verifyReceipt` from
[`@vdm-nexus/x402`](https://www.npmjs.com/package/@vdm-nexus/x402):

```ts
import { verifyReceipt } from "@vdm-nexus/x402";

const v = await verifyReceipt({
  receipt,
  prompt,
  response,
  operatorKey: process.env.MY_OPERATOR_PUBKEY!,
});
// v.ok === true when on-chain payment + signed body all check out
```

Publish your operator pubkey wherever you like — `bs58.encode(nacl.sign.keyPair.fromSecretKey(bs58.decode(OPERATOR_SECRET_KEY)).publicKey)`. We recommend serving it at `/operator-key` like Nexus does so callers can fetch it automatically.

## Config

```ts
type PaywallConfig = {
  amount: number;                              // flat USDC, capped by maxCostUsdc
  recipient: string;                           // wallet that receives USDC
  network: "solana-devnet" | "solana-mainnet" | "base" | "base-sepolia" | string;
  operatorSecretKey: string;                   // base58 tweetnacl secretKey
  facilitator:
    | { mode: "http"; url: string; apiKey?: string }
    | { mode: "mock" }                         // dev only
    | { mode: "custom"; client: FacilitatorClient };

  onPaid: (ctx) => Promise<{
    response: unknown;
    promptForHash: string;
    responseForHash: string;
    model: string;
    upstream?: string;
    cost_usdc?: number;
    extra?: Record<string, unknown>;            // merged into the signed receipt
  }>;

  // Safety
  maxCostUsdc?: number;                        // default 0.10
  loopDetection?: (payer, body) => boolean | Promise<boolean>;
  allowedPayers?: ReadonlySet<string>;

  // $VDM hooks — wire today, activate when the token launches
  tokenDiscountBps?: (payer) => number | Promise<number>;
  cashbackEnabled?: boolean;
  cashbackBps?: number;
  stakingMultiplier?: (payer) => number | Promise<number>;

  // Plumbing
  logger?: { info; warn; error };
  resource?: { url?: string; description?: string; serviceName?: string };
};
```

## Status

`0.1.x`. Devnet only — see the [VDM Nexus README](https://github.com/vdmnexus/vdmnexus)
for the mainnet roadmap.

## License

MIT.
