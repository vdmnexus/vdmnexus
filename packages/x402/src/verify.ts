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

async function rpcGetTransaction(
  rpc: string,
  signature: string
): Promise<ParsedTransaction | null> {
  const res = await fetch(rpc, {
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
  if (!res.ok) throw new Error(`RPC getTransaction HTTP ${res.status}`);
  const data = (await res.json()) as {
    result?: ParsedTransaction | null;
    error?: { message: string };
  };
  if (data.error) throw new Error(`RPC getTransaction: ${data.error.message}`);
  return data.result ?? null;
}

async function verifyOnChain(
  rpc: string,
  payment: NexusReceipt["payment"],
  expectedSigner: string
): Promise<{ tx_ok: boolean; payer_ok: boolean }> {
  const tx = await rpcGetTransaction(rpc, payment.tx_signature);
  if (!tx || tx.meta?.err) return { tx_ok: false, payer_ok: false };

  const signer =
    tx.transaction.message.accountKeys.find((k) => k.signer)?.pubkey ?? null;
  const payer_ok = signer === expectedSigner;

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
