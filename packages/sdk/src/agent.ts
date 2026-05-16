import bs58 from "bs58";
import nacl from "tweetnacl";

export type InferenceResponse = {
  ok: boolean;
  text?: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    cost_usdc: number;
    latency_ms: number;
  };
  balance_usdc?: number;
  error?: string;
  detail?: string;
};

export type InferenceOptions = {
  prompt: string;
  model?: string;
};

const DEFAULT_MODEL = "openai/gpt-4o-mini";

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

  buildRequestBody(opts: InferenceOptions): string {
    return JSON.stringify({
      prompt: opts.prompt,
      model: opts.model ?? DEFAULT_MODEL,
      timestamp: new Date().toISOString(),
      nonce: cryptoRandomUUID(),
    });
  }

  async inference(
    endpoint: string,
    opts: InferenceOptions
  ): Promise<InferenceResponse> {
    const body = this.buildRequestBody(opts);
    const signature = this.signBody(body);

    const res = await fetch(`${endpoint.replace(/\/$/, "")}/inference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Nexus-Pubkey": this.pubkey,
        "X-Nexus-Signature": signature,
      },
      body,
    });

    return (await res.json()) as InferenceResponse;
  }
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
