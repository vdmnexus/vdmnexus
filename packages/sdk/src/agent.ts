import bs58 from "bs58";
import nacl from "tweetnacl";

export type TaskType = "fast" | "reasoning" | "general";

export type Receipt = {
  agent_pubkey: string;
  provider: string;
  model: string;
  cost_usdc: number;
  balance_remaining: number;
  prompt_hash: string;
  response_hash: string;
  timestamp: number;
  inference_id: string | null;
  points_total: number;
};

export type InferenceResponse = {
  ok: boolean;
  result?: string;
  receipt?: Receipt;
  error?: string;
  detail?: string;
};

export type InferenceOptions = {
  prompt: string;
  task_type?: TaskType;
  max_cost_usdc?: number;
  /**
   * When the prepaid balance is empty, automatically request a sponsored
   * grant from `${endpoint}/grants` and retry once. Default `true` — this
   * is the zero-friction first-call path for new agents. Set to `false`
   * to fail fast on insufficient credits without the extra grant probe.
   */
  autoGrant?: boolean;
};

export type GrantResponse = {
  ok: boolean;
  agent_pubkey?: string;
  grant_usdc?: number;
  balance_usdc?: number;
  error?: string;
  detail?: string;
};

const DEFAULT_TASK_TYPE: TaskType = "general";

export class Agent {
  readonly publicKey: Uint8Array;
  readonly secretKey: Uint8Array;

  constructor(secretKey: Uint8Array) {
    if (secretKey.length !== 64) {
      throw new Error("secretKey must be 64 bytes (Ed25519 seed + public key)");
    }
    this.secretKey = secretKey;
    this.publicKey = secretKey.slice(32);
  }

  static generate(): Agent {
    const kp = nacl.sign.keyPair();
    return new Agent(kp.secretKey);
  }

  static fromBase58(secretKeyBase58: string): Agent {
    return new Agent(bs58.decode(secretKeyBase58));
  }

  get pubkey(): string {
    return bs58.encode(this.publicKey);
  }

  get secretKeyBase58(): string {
    return bs58.encode(this.secretKey);
  }

  signBody(body: string): string {
    const bytes = new TextEncoder().encode(body);
    const sig = nacl.sign.detached(bytes, this.secretKey);
    return bs58.encode(sig);
  }

  async inference(
    endpoint: string,
    opts: InferenceOptions
  ): Promise<InferenceResponse> {
    const base = endpoint.replace(/\/$/, "");
    const autoGrant = opts.autoGrant !== false; // default on

    const first = await this._inferenceOnce(base, opts);
    if (first.ok) return first;

    // The grant endpoint exists to remove the "buy USDC before the first
    // call" friction. If the agent has zero balance, probe it once. A
    // grant failure (already issued, IP cap, budget exhausted) is silent —
    // the user gets the original insufficient_credits error back, which is
    // the same outcome they would have had without auto-grant.
    if (autoGrant && first.error === "insufficient_credits") {
      const grant = await this.grant(base);
      if (grant.ok) {
        return await this._inferenceOnce(base, opts);
      }
    }
    return first;
  }

  /**
   * Request a sponsored USDC grant for this agent's pubkey from
   * `${endpoint}/grants`. One grant per pubkey ever, capped per-IP and per
   * global daily budget by the operator. Safe to call explicitly even if
   * `inference()` already auto-grants — the server returns 409
   * `grant_already_issued` with the current balance.
   */
  async grant(endpoint: string): Promise<GrantResponse> {
    const base = endpoint.replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/grants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_pubkey: this.pubkey }),
      });
      return await parseJsonResponse<GrantResponse>(res, `${base}/grants`);
    } catch (e) {
      return {
        ok: false,
        error: "grant_request_failed",
        detail: e instanceof Error ? e.message : "unknown",
      };
    }
  }

  private async _inferenceOnce(
    base: string,
    opts: InferenceOptions
  ): Promise<InferenceResponse> {
    const body = JSON.stringify({
      prompt: opts.prompt,
      task_type: opts.task_type ?? DEFAULT_TASK_TYPE,
      nonce: cryptoRandomUUID(),
      timestamp: Date.now(),
      ...(opts.max_cost_usdc !== undefined
        ? { max_cost_usdc: opts.max_cost_usdc }
        : {}),
    });
    const signature = this.signBody(body);

    const res = await fetch(`${base}/inference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Pubkey": this.pubkey,
        "X-Nexus-Signature": signature,
      },
      body,
    });

    return await parseJsonResponse<InferenceResponse>(res, `${base}/inference`);
  }
}

/**
 * Parse a fetch Response that is expected to carry a JSON body.
 *
 * Endpoints normally return JSON on every path, but infrastructure in
 * front of them (load balancer, serverless platform, crashed handler)
 * can produce an empty or non-JSON body — historically that surfaced as
 * a bare `SyntaxError: Unexpected end of JSON input` with no HTTP
 * context. Instead, return a structured `{ ok: false }` object that
 * names the status code, the endpoint, and a snippet of whatever body
 * came back, so callers can log and display something actionable.
 */
async function parseJsonResponse<T extends { ok: boolean; error?: string; detail?: string }>(
  res: Response,
  endpoint: string
): Promise<T> {
  const text = await res.text();
  if (text.length > 0) {
    try {
      return JSON.parse(text) as T;
    } catch {
      return {
        ok: false,
        error: "upstream_non_json",
        detail: `HTTP ${res.status} from ${endpoint} returned a non-JSON body: ${text.slice(0, 200)}`,
      } as T;
    }
  }
  return {
    ok: false,
    error: "upstream_empty_body",
    detail: `HTTP ${res.status} from ${endpoint} returned an empty body`,
  } as T;
}

function cryptoRandomUUID(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  const bytes = nacl.randomBytes(16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
