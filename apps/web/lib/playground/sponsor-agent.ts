// STUB — owned by the parallel playground-storage session. The real
// implementation will replace this file when its PR merges. Until then,
// calls throw.

export type SponsorAgent = {
  secretKey: Uint8Array;
  pubkey: string;
};

export async function getSponsorAgent(): Promise<SponsorAgent> {
  throw new Error("not_implemented: lib/playground/sponsor-agent.ts");
}

export async function checkDailyBudget(): Promise<{ ok: boolean }> {
  throw new Error("not_implemented: lib/playground/sponsor-agent.ts");
}
