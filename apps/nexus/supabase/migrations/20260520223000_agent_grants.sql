-- Sponsored grants — give a fresh agent_pubkey a small USDC credit so it can
-- make signed-inference calls without buying USDC first. One grant per pubkey
-- ever (enforced by a unique index), rate-limited by ip_hash, and capped by a
-- global daily budget enforced in the route.
--
-- The credit lands in the existing credits_ledger keyed by agent_pubkey, so the
-- agent's first /v1/inference call works through the regular signed-request
-- path with no new branch in the inference route.

CREATE TABLE public.agent_grants (
  id          bigserial PRIMARY KEY,
  agent_pubkey text NOT NULL REFERENCES public.agents(pubkey) ON DELETE CASCADE,
  ip_hash      text NOT NULL,
  amount_usdc  numeric(12, 6) NOT NULL CHECK (amount_usdc > 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- One grant per agent_pubkey, ever. The route catches 23505 and returns 409.
CREATE UNIQUE INDEX agent_grants_pubkey_idx
  ON public.agent_grants (agent_pubkey);

CREATE INDEX agent_grants_ip_hash_created_idx
  ON public.agent_grants (ip_hash, created_at DESC);

CREATE INDEX agent_grants_created_at_idx
  ON public.agent_grants (created_at DESC);

ALTER TABLE public.agent_grants ENABLE ROW LEVEL SECURITY;
-- No policies — only the service role writes/reads this table.
