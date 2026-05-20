import { randomBytes } from "node:crypto";
import { getServiceClient } from "@/lib/server-supabase";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const SHORT_ID_LEN = 10;
// Largest multiple of 58 < 256. Sampling bytes >= this cutoff would skew the
// distribution toward the first 256 % 58 = 18 alphabet characters, so we
// reject them and resample.
const REJECTION_CUTOFF = 232;

export function shortId(): string {
  let out = "";
  while (out.length < SHORT_ID_LEN) {
    const buf = randomBytes(SHORT_ID_LEN);
    for (let i = 0; i < buf.length && out.length < SHORT_ID_LEN; i++) {
      const b = buf[i];
      if (b < REJECTION_CUTOFF) out += BASE58_ALPHABET[b % 58];
    }
  }
  return out;
}

export async function saveReceipt(
  prompt: string,
  response: string,
  receipt: unknown,
  ipHash: string
): Promise<string> {
  const supabase = getServiceClient();
  // 58^10 ≈ 4.3e17; collisions are vanishingly unlikely, but on the off chance
  // we hit one (or a parallel write), retry a few times.
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = shortId();
    const { error } = await supabase.from("playground_receipts").insert({
      id,
      receipt: receipt as Record<string, unknown>,
      prompt,
      response,
      ip_hash: ipHash,
    });
    if (!error) return id;
    if (error.code !== "23505") {
      throw new Error(`saveReceipt: ${error.message}`);
    }
  }
  throw new Error("saveReceipt: exhausted retries");
}

export type PlaygroundReceipt = {
  id: string;
  prompt: string;
  response: string;
  receipt: Record<string, unknown>;
  created_at: string;
};

export async function getReceipt(
  id: string
): Promise<PlaygroundReceipt | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("playground_receipts")
    .select("id, prompt, response, receipt, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getReceipt: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id as string,
    prompt: data.prompt as string,
    response: data.response as string,
    receipt: data.receipt as Record<string, unknown>,
    created_at: data.created_at as string,
  };
}
