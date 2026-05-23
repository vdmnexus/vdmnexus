/**
 * Wire 1 Phase A — receipt fee + burn pool pricing.
 *
 * Every paid call to the signed-inference rail bundles two USDC charges
 * into a single x402 challenge:
 *
 *   1. **Inference component** — the upstream model cost. For
 *      /chat/completions this is a flat amount declared in env
 *      (X402_FLAT_PRICE_USDC) because OpenRouter's actual `usage.cost`
 *      isn't known until after the upstream call returns. The flat
 *      price is the agent's max-bid for the call.
 *   2. **Receipt fee** — NEXUS_RECEIPT_FEE_USDC, defaults to $0.01.
 *      Split 50/50 (NEXUS_BURN_POOL_SHARE, defaults to 0.5):
 *        - burn_pool_share → burn_pool_ledger, accumulates in USDC on
 *          Solana, swapped to $NEXUS at launch and burned (Phase B).
 *        - treasury_share → protocol treasury.
 *
 * The challenge issuer and the receipt-builder both read the same
 * breakdown so the agent sees a single line item (`amount_usdc`) but
 * the ledger and the public burn counter can attribute each share
 * unambiguously.
 */

const DEFAULT_RECEIPT_FEE_USDC = 0.01;
const DEFAULT_BURN_POOL_SHARE = 0.5;

export type FeeBreakdown = {
  /** USDC charged for the inference itself (the flat 402 price). */
  inferenceUsdc: number;
  /** USDC added on top as the receipt fee. */
  receiptFeeUsdc: number;
  /** Portion of receiptFeeUsdc earmarked for the burn pool. */
  burnPoolShareUsdc: number;
  /** Portion of receiptFeeUsdc earmarked for the treasury. */
  treasuryShareUsdc: number;
  /** What the agent actually pays in the x402 settlement. */
  totalUsdc: number;
};

export function getReceiptFeeUsdc(): number {
  const raw = process.env.NEXUS_RECEIPT_FEE_USDC;
  const n = raw ? Number(raw) : NaN;
  // Fee is optional in principle — 0 disables it without breaking the
  // rest of the pipeline. Negative or non-finite values fall back to
  // the default so a misconfigured env can't accidentally pay agents.
  if (!Number.isFinite(n) || n < 0) return DEFAULT_RECEIPT_FEE_USDC;
  return n;
}

export function getBurnPoolShare(): number {
  const raw = process.env.NEXUS_BURN_POOL_SHARE;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 1) return DEFAULT_BURN_POOL_SHARE;
  return n;
}

/**
 * Round to USDC's 6-decimal atomic precision. Numeric math on doubles
 * can leak trailing 1e-17 garbage that the Postgres `numeric(20, 6)`
 * column would store as a long string — round at the boundary instead.
 */
function roundUsdc(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

/**
 * Compute the breakdown for a single paid call. `inferenceUsdc` is the
 * inference component the route declares (for /chat/completions today
 * this is the flat X402_FLAT_PRICE_USDC; for the prepaid /inference
 * path it is the actual upstream `usage.cost`).
 */
export function computeFeeBreakdown(inferenceUsdc: number): FeeBreakdown {
  const fee = getReceiptFeeUsdc();
  const burnShare = getBurnPoolShare();
  const burnPoolShareUsdc = roundUsdc(fee * burnShare);
  // Treasury gets the residue so the two shares always sum to fee
  // exactly (no rounding drift between the column sums).
  const treasuryShareUsdc = roundUsdc(fee - burnPoolShareUsdc);
  return {
    inferenceUsdc: roundUsdc(inferenceUsdc),
    receiptFeeUsdc: roundUsdc(fee),
    burnPoolShareUsdc,
    treasuryShareUsdc,
    totalUsdc: roundUsdc(inferenceUsdc + fee),
  };
}
