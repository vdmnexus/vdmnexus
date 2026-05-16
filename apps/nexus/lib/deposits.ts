import {
  getParsedTransaction,
  getSignaturesForAddress,
} from "./solana-rpc";

export type DepositMatch = {
  sender: string;
  amount_usdc: number;
  tx_signature: string;
  block_time: number | null;
};

export async function findDepositsInTx(args: {
  signature: string;
  depositAddress: string;
  usdcMint: string;
}): Promise<DepositMatch[]> {
  const tx = await getParsedTransaction(args.signature);
  if (!tx || tx.meta?.err) return [];

  const signer = tx.transaction.message.accountKeys.find((k) => k.signer);
  if (!signer) return [];

  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];

  const matches: DepositMatch[] = [];
  for (const p of post) {
    if (p.owner !== args.depositAddress) continue;
    if (p.mint !== args.usdcMint) continue;
    const prior = pre.find(
      (b) => b.accountIndex === p.accountIndex && b.mint === p.mint
    );
    const before = BigInt(prior?.uiTokenAmount.amount ?? "0");
    const after = BigInt(p.uiTokenAmount.amount);
    const deltaRaw = after - before;
    if (deltaRaw <= 0n) continue;
    const amount = Number(deltaRaw) / 10 ** p.uiTokenAmount.decimals;
    matches.push({
      sender: signer.pubkey,
      amount_usdc: amount,
      tx_signature: args.signature,
      block_time: tx.blockTime,
    });
  }
  return matches;
}

export async function scanDeposits(args: {
  depositAddress: string;
  usdcMint: string;
  limit: number;
}): Promise<DepositMatch[]> {
  const sigs = await getSignaturesForAddress(args.depositAddress, args.limit);
  const out: DepositMatch[] = [];
  for (const s of sigs) {
    if (s.err) continue;
    if (
      s.confirmationStatus !== "confirmed" &&
      s.confirmationStatus !== "finalized"
    ) {
      continue;
    }
    try {
      const matches = await findDepositsInTx({
        signature: s.signature,
        depositAddress: args.depositAddress,
        usdcMint: args.usdcMint,
      });
      out.push(...matches);
    } catch (e) {
      console.error("[deposits] parse failed", s.signature, e);
    }
  }
  return out;
}
