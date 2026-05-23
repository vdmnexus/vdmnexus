-- Wire 1 Phase A — receipt fee + burn pool accumulation.
--
-- Every paid call to /v1/chat/completions adds a flat USDC receipt fee
-- on top of the upstream inference cost. 50% of every fee accumulates
-- here, waiting to swap into $NEXUS at token launch and burn (Phase B).
-- 50% accrues to the protocol treasury (also tracked here for ledger
-- symmetry; the actual treasury transfer happens out of band).
--
-- This table is append-only. Service-role writes only — same convention
-- as credits_ledger. Idempotency mirrors credits_ledger: a replayed
-- tx_signature is silently dropped at the database level via a partial
-- unique index, so the burn pool can't be inflated by replaying the
-- same x402 settlement.

CREATE TABLE IF NOT EXISTS public.burn_pool_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  tx_signature text,
  agent_pubkey text NOT NULL REFERENCES public.agents(pubkey),
  fee_usdc numeric(20, 6) NOT NULL,
  burn_pool_share_usdc numeric(20, 6) NOT NULL,
  treasury_share_usdc numeric(20, 6) NOT NULL,
  network text NOT NULL,
  source text NOT NULL,
  inference_id uuid REFERENCES public.inference_logs(id)
);

-- Idempotency: a replayed tx_signature must not double-insert. Mirrors
-- the credits_ledger_tx_idx pattern. NULL tx_signature is allowed
-- multiple times (prepaid inference path uses inference_id instead).
CREATE UNIQUE INDEX IF NOT EXISTS burn_pool_ledger_tx_idx
  ON public.burn_pool_ledger (tx_signature)
  WHERE tx_signature IS NOT NULL;

-- /api/burn-pool reads the all-time sum and per-day buckets ordered by
-- created_at — keep that scan cheap.
CREATE INDEX IF NOT EXISTS burn_pool_ledger_created_at_idx
  ON public.burn_pool_ledger (created_at DESC);

-- Per-agent burn attribution (e.g. "top burners" leaderboard later).
CREATE INDEX IF NOT EXISTS burn_pool_ledger_agent_pubkey_idx
  ON public.burn_pool_ledger (agent_pubkey);

ALTER TABLE public.burn_pool_ledger ENABLE ROW LEVEL SECURITY;
-- No policies: service-role-only writes/reads (matches agents,
-- credits_ledger, nonces, inference_logs convention).
