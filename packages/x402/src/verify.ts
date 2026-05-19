import { createHash } from "node:crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import type {
  ChatMessage,
  NexusReceipt,
  OpenAIChatCompletion,
} from "./types.js";

export type VerifyReceiptParams = {
  receipt: NexusReceipt;
  prompt: ChatMessage[];
  response: OpenAIChatCompletion;
  /** Override Solana RPC URL. Default derived from receipt.payment.network. */
  rpc?: string;
  /** Base URL (e.g. "https://nexus.vdmnexus.com"). Used to fetch the
   * operator key from `${endpoint}/api/v1/operator-key` if `operatorKey`
   * is not supplied. */
  endpoint?: string;
  /** Base58-encoded Ed25519 operator public key. If absent, fetched from
   * the endpoint. */
  operatorKey?: string;
};

export type VerifyReceiptResult = {
  ok: boolean;
  checks: {
    prompt_hash_ok: boolean;
    response_hash_ok: boolean;
    nexus_signature_ok: boolean;
    /** Vacuously true for prepaid receipts (no payment field). */
    payment_on_chain_ok: boolean;
    /** Vacuously true for prepaid receipts. */
    payer_matches: boolean;
  };
};

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k]))
      .join(",") +
    "}"
  );
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function defaultRpc(network: string): string {
  return network === "solana:devnet"
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";
}

async function fetchOperatorKey(endpoint: string): Promise<string> {
  const url = endpoint.replace(/\/$/, "") + "/api/v1/operator-key";
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`operator-key fetch failed: ${r.status}`);
  }
  const body = (await r.json()) as { pubkey?: string };
  if (!body.pubkey) {
    throw new Error("operator-key response missing pubkey");
  }
  return body.pubkey;
}

type TokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { amount: string; decimals: number };
};

type ParsedTransaction = {
  transaction: {
    message: { accountKeys: Array<{ pubkey: string; signer: boolean }> };
    signatures: string[];
  };
  meta: {
    err: unknown;
    preTokenBalances?: TokenBalance[];
    postTokenBalances?: TokenBalance[];
  } | null;
};

type RpcResult =
  | { kind: "ok"; tx: ParsedTransaction }
  | { kind: "missing" }
  | { kind: "transient"; reason: string };

async function rpcGetTransactionOnce(
  rpc: string,
  signature: string
): Promise<RpcResult> {
  let res: Response;
  try {
    res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          signature,
          {
            encoding: "jsonParsed",
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          },
        ],
      }),
    });
  } catch (e) {
    return { kind: "transient", reason: `network: ${(e as Error).message}` };
  }
  // 429 (rate limit) and 5xx (RPC node hiccup) are transient.
  if (res.status === 429 || res.status >= 500) {
    return { kind: "transient", reason: `HTTP ${res.status}` };
  }
  if (!res.ok) throw new Error(`RPC getTransaction HTTP ${res.status}`);
  const data = (await res.json()) as {
    result?: ParsedTransaction | null;
    error?: { code?: number; message: string };
  };
  if (data.error) {
    // -32005 is the standard "node is behind / rate limited" rejection.
    if (data.error.code === -32005) {
      return { kind: "transient", reason: data.error.message };
    }
    throw new Error(`RPC getTransaction: ${data.error.message}`);
  }
  if (!data.result) return { kind: "missing" };
  return { kind: "ok", tx: data.result };
}

/**
 * Wraps `rpcGetTransactionOnce` with a short retry loop. The public Solana
 * RPCs (especially devnet) can lag well past commitment confirmation
 * before indexing a `getTransaction` lookup — we've seen 60–90s on
 * api.devnet.solana.com. Without a retry, verifyReceipt called immediately
 * after payAndInfer falsely fails its on-chain checks. We poll up to ~120s
 * before giving up. Pass `params.rpc` pointing at a faster provider
 * (Helius, Triton, QuickNode) to skip most of this wait.
 */
async function rpcGetTransaction(
  rpc: string,
  signature: string
): Promise<ParsedTransaction | null> {
  const deadline = Date.now() + 120_000;
  let attempt = 0;
  while (true) {
    const r = await rpcGetTransactionOnce(rpc, signature);
    if (r.kind === "ok") return r.tx;
    if (Date.now() >= deadline) return null;
    // 1.5s, 3s, 6s, capped at 6s. Public RPCs both lag a few seconds after
    // confirmation AND rate-limit aggressive polling, so be patient between
    // tries.
    const delay = Math.min(1_500 * 2 ** attempt, 6_000);
    attempt++;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

async function verifyOnChain(
  rpc: string,
  payment: NexusReceipt["payment"],
  expectedSigner: string
): Promise<{ tx_ok: boolean; payer_ok: boolean }> {
  const tx = await rpcGetTransaction(rpc, payment.tx_signature);
  if (!tx || tx.meta?.err) return { tx_ok: false, payer_ok: false };

  // The agent signs the SPL transfer as authority over the source token
  // account, but is NOT necessarily the fee payer (signer index 0). In an
  // x402-svm consolidated topology the facilitator pays SOL fees and the
  // agent signs the transfer — so we check the agent is *any* signer on
  // the tx, not specifically the first one.
  const signers = tx.transaction.message.accountKeys
    .filter((k) => k.signer)
    .map((k) => k.pubkey);
  const payer_ok = signers.includes(expectedSigner);

  if (!payment.pay_to) {
    // No pay_to in the receipt — we can't anchor the recipient. Treat as
    // not verifiable rather than passing silently.
    return { tx_ok: false, payer_ok };
  }

  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  const expectedRawAmount = BigInt(Math.round(payment.amount_usdc * 1_000_000));

  let tx_ok = false;
  for (const p of post) {
    if (p.owner !== payment.pay_to) continue;
    const prior = pre.find(
      (b) => b.accountIndex === p.accountIndex && b.mint === p.mint
    );
    const before = BigInt(prior?.uiTokenAmount.amount ?? "0");
    const after = BigInt(p.uiTokenAmount.amount);
    const delta = after - before;
    if (delta >= expectedRawAmount) {
      tx_ok = true;
      break;
    }
  }
  return { tx_ok, payer_ok };
}

export async function verifyReceipt(
  params: VerifyReceiptParams
): Promise<VerifyReceiptResult> {
  const promptStr = params.prompt
    .map((m) => `${m.role}:${m.content}`)
    .join("\n");
  const respText = params.response.choices?.[0]?.message?.content ?? "";
  const prompt_hash_ok = sha256Hex(promptStr) === params.receipt.prompt_hash;
  const response_hash_ok = sha256Hex(respText) === params.receipt.response_hash;

  let nexus_signature_ok = false;
  const r = params.receipt;
  if (r.v === 2 && r.nexus_signature) {
    if (!params.operatorKey && !params.endpoint) {
      throw new Error(
        "verifyReceipt: provide operatorKey or endpoint to verify the Nexus signature"
      );
    }
    const pub =
      params.operatorKey ?? (await fetchOperatorKey(params.endpoint!));
    const { nexus_signature, ...rest } = r;
    const payload = new TextEncoder().encode(canonicalize(rest));
    try {
      nexus_signature_ok = nacl.sign.detached.verify(
        payload,
        bs58.decode(nexus_signature),
        bs58.decode(pub)
      );
    } catch {
      nexus_signature_ok = false;
    }
  }

  let payment_on_chain_ok = true;
  let payer_matches = true;
  if (r.payment) {
    const rpc = params.rpc ?? defaultRpc(r.payment.network);
    const v = await verifyOnChain(rpc, r.payment, r.agent_pubkey);
    payment_on_chain_ok = v.tx_ok;
    payer_matches = v.payer_ok;
  }

  return {
    ok:
      prompt_hash_ok &&
      response_hash_ok &&
      nexus_signature_ok &&
      payment_on_chain_ok &&
      payer_matches,
    checks: {
      prompt_hash_ok,
      response_hash_ok,
      nexus_signature_ok,
      payment_on_chain_ok,
      payer_matches,
    },
  };
}
