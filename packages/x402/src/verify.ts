import { createHash } from "node:crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import type {
  ChatMessage,
  NexusReceipt,
  OpenAIChatCompletion,
  SirX402,
} from "./types.js";

export type VerifyReceiptParams = {
  receipt: NexusReceipt;
  /** The prompt the receipt covers. For x402 chat-completion receipts,
   * pass the `ChatMessage[]` you sent. For prepaid `/v1/inference`
   * receipts, pass the raw prompt string. See spec §10. */
  prompt: ChatMessage[] | string;
  /** The response the receipt covers. For x402 chat-completion receipts,
   * pass the `OpenAIChatCompletion` body you received. For prepaid
   * `/v1/inference` receipts, pass `result` (the raw response string).
   * See spec §10. */
  response: OpenAIChatCompletion | string;
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
  // Solana — accept short forms and the genesis-hash forms.
  if (network === "solana:devnet" || network.includes("EtWTRABZ")) {
    return "https://api.devnet.solana.com";
  }
  if (network.startsWith("solana:")) {
    return "https://api.mainnet-beta.solana.com";
  }
  // Base (EVM).
  if (network === "eip155:84532") return "https://sepolia.base.org";
  if (network === "eip155:8453") return "https://mainnet.base.org";
  // Fallback — Solana mainnet, matching legacy behavior.
  return "https://api.mainnet-beta.solana.com";
}

function isEvm(network: string): boolean {
  return network.startsWith("eip155:");
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

// ─── EVM verification path ────────────────────────────────────────────────
// ERC-20 Transfer event topic: keccak256("Transfer(address,address,uint256)")
const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

type EvmLog = {
  address: string;
  topics: string[];
  data: string;
};

type EvmTxReceipt = {
  status: string;
  from: string;
  logs: EvmLog[];
};

async function evmGetTransactionReceiptOnce(
  rpc: string,
  txHash: string
): Promise<
  | { kind: "ok"; receipt: EvmTxReceipt }
  | { kind: "missing" }
  | { kind: "transient"; reason: string }
> {
  let res: Response;
  try {
    res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
    });
  } catch (e) {
    return { kind: "transient", reason: `network: ${(e as Error).message}` };
  }
  if (res.status === 429 || res.status >= 500) {
    return { kind: "transient", reason: `HTTP ${res.status}` };
  }
  if (!res.ok) throw new Error(`RPC eth_getTransactionReceipt HTTP ${res.status}`);
  const data = (await res.json()) as {
    result?: EvmTxReceipt | null;
    error?: { code?: number; message: string };
  };
  if (data.error) throw new Error(`RPC eth_getTransactionReceipt: ${data.error.message}`);
  if (!data.result) return { kind: "missing" };
  return { kind: "ok", receipt: data.result };
}

async function evmGetTransactionReceipt(
  rpc: string,
  txHash: string
): Promise<EvmTxReceipt | null> {
  // Same retry envelope as the Solana side. Base RPCs are generally faster
  // than Solana devnet, but indexing lag still happens on Sepolia.
  const deadline = Date.now() + 120_000;
  let attempt = 0;
  while (true) {
    const r = await evmGetTransactionReceiptOnce(rpc, txHash);
    if (r.kind === "ok") return r.receipt;
    if (Date.now() >= deadline) return null;
    const delay = Math.min(1_500 * 2 ** attempt, 6_000);
    attempt++;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/** Extract `0x`-prefixed lowercase 20-byte address from a padded 32-byte topic. */
function addressFromTopic(topic: string): string {
  // topic = 0x + 64 hex chars. Address = last 40.
  return ("0x" + topic.slice(-40)).toLowerCase();
}

/**
 * Canonical USDC contract for a given EVM CAIP-2 network. The receipt's
 * `payment` object doesn't carry the asset address (USDC is the only
 * supported asset on x402 today), so verifiers hardcode the known
 * contract per chain to prevent log-injection from arbitrary ERC-20s.
 */
function knownEvmUsdc(network: string): string | null {
  if (network === "eip155:8453")
    return "0x833589fCD6eDb6E08f4c7C32A07f04b6dEDD1c2E".toLowerCase();
  if (network === "eip155:84532")
    return "0x036CbD53842c5426634e7929541eC2318f3dCF7e".toLowerCase();
  return null;
}

async function verifyOnChainEvm(
  rpc: string,
  payment: SirX402["payment"],
  expectedSigner: string
): Promise<{ tx_ok: boolean; payer_ok: boolean }> {
  const receipt = await evmGetTransactionReceipt(rpc, payment.tx_signature);
  if (!receipt) return { tx_ok: false, payer_ok: false };
  if (receipt.status !== "0x1") return { tx_ok: false, payer_ok: false };

  const expectedAsset = knownEvmUsdc(payment.network);
  if (!expectedAsset) return { tx_ok: false, payer_ok: false };

  const expectedRawAmount = BigInt(Math.round(payment.amount_usdc * 1_000_000));
  const payToLower = payment.pay_to.toLowerCase();
  const expectedSignerLower = expectedSigner.toLowerCase();

  let tx_ok = false;
  let payer_ok = false;

  for (const log of receipt.logs) {
    if (log.topics[0]?.toLowerCase() !== ERC20_TRANSFER_TOPIC) continue;
    if (log.topics.length < 3) continue;
    // Reject Transfer logs from any token other than the canonical USDC
    // contract for this network. Prevents an attacker from spoofing a
    // payment by emitting Transfer events from a worthless ERC-20.
    if (log.address.toLowerCase() !== expectedAsset) continue;

    const from = addressFromTopic(log.topics[1]!);
    const to = addressFromTopic(log.topics[2]!);
    const value = BigInt(log.data);

    if (to === payToLower && value >= expectedRawAmount) {
      tx_ok = true;
      if (from === expectedSignerLower) payer_ok = true;
    }
  }

  return { tx_ok, payer_ok };
}

// ─── Solana verification path ─────────────────────────────────────────────

async function verifyOnChain(
  rpc: string,
  payment: SirX402["payment"],
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

  // Defensive: spec requires `pay_to` on v=2, but a malformed receipt
  // (e.g. pre-spec wire data) could arrive without it.
  if (!payment.pay_to) {
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

function promptToString(p: ChatMessage[] | string): string {
  return typeof p === "string"
    ? p
    : p.map((m) => `${m.role}:${m.content}`).join("\n");
}

function responseToString(r: OpenAIChatCompletion | string): string {
  return typeof r === "string" ? r : r.choices?.[0]?.message?.content ?? "";
}

export async function verifyReceipt(
  params: VerifyReceiptParams
): Promise<VerifyReceiptResult> {
  const promptStr = promptToString(params.prompt);
  const respText = responseToString(params.response);
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
    const v = isEvm(r.payment.network)
      ? await verifyOnChainEvm(rpc, r.payment, r.agent_pubkey)
      : await verifyOnChain(rpc, r.payment, r.agent_pubkey);
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
