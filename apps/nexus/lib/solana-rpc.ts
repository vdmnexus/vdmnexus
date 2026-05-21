const DEVNET = "https://api.devnet.solana.com";
const MAINNET = "https://api.mainnet-beta.solana.com";

export function rpcUrl(): string {
  const explicit = process.env.SOLANA_RPC_URL;
  if (explicit) return explicit;
  return process.env.SOLANA_NETWORK === "mainnet-beta" ? MAINNET : DEVNET;
}

type JsonRpcResponse<T> = { result?: T; error?: { code: number; message: string } };

async function call<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) {
    throw new Error(`RPC ${method} HTTP ${res.status}`);
  }
  const data = (await res.json()) as JsonRpcResponse<T>;
  if (data.error) {
    throw new Error(`RPC ${method}: ${data.error.message}`);
  }
  if (data.result === undefined) {
    throw new Error(`RPC ${method}: missing result`);
  }
  return data.result;
}

export type SignatureInfo = {
  signature: string;
  slot: number;
  blockTime: number | null;
  confirmationStatus: "processed" | "confirmed" | "finalized" | null;
  err: unknown;
};

export type TokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number | null;
    uiAmountString: string;
  };
};

export type ParsedAccountKey = {
  pubkey: string;
  signer: boolean;
  writable: boolean;
  source?: string;
};

export type ParsedTransaction = {
  blockTime: number | null;
  slot: number;
  transaction: {
    message: {
      accountKeys: ParsedAccountKey[];
    };
    signatures: string[];
  };
  meta: {
    err: unknown;
    fee: number;
    preTokenBalances?: TokenBalance[];
    postTokenBalances?: TokenBalance[];
  } | null;
};

export async function getSignaturesForAddress(
  address: string,
  limit: number = 50
): Promise<SignatureInfo[]> {
  return call<SignatureInfo[]>("getSignaturesForAddress", [
    address,
    { limit, commitment: "confirmed" },
  ]);
}

export async function getParsedTransaction(
  signature: string
): Promise<ParsedTransaction | null> {
  return call<ParsedTransaction | null>("getTransaction", [
    signature,
    {
      encoding: "jsonParsed",
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    },
  ]);
}

/** Returns the SOL balance of an address, in lamports (1 SOL = 1e9 lamports). */
export async function getBalanceLamports(address: string): Promise<number> {
  const result = await call<{ value: number }>("getBalance", [
    address,
    { commitment: "confirmed" },
  ]);
  return result.value;
}
