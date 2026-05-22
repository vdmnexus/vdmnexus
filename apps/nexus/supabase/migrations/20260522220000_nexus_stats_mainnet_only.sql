-- Mainnet-only stats for the public homepage counter.
--
-- The public-facing /api/stats route reads from this function and feeds
-- `<LiveStats />` on vdmnexus.com. We deliberately exclude devnet and
-- testnet activity from those numbers — the "first 10 paying agents"
-- narrative is about real economic activity, not free test traffic.
--
-- This replaces the original nexus_stats() (introduced in migration
-- 20260522120000_nexus_stats_fn.sql) which counted all networks.
--
-- Mainnet definitions (CAIP-2):
--   Solana mainnet: "solana:5eykt..." (genesis-hash prefix form)
--                   OR the symbolic "solana:mainnet" alias
--   Base mainnet:   "eip155:8453"
--
-- Devnet / testnet (excluded):
--   Solana devnet:  "solana:EtWTR..." OR "solana:devnet"
--   Base Sepolia:   "eip155:84532"
--
-- Filter logic:
--   * tx_signature IS NOT NULL  — only on-chain settlements (drop the
--     prepaid /v1/inference rows; those are off-chain credits)
--   * network LIKE 'solana:5eykt%' OR network IN known mainnet strings
--
-- The `/receipts` public-index page still shows ALL networks (with a
-- "devnet" badge); only the homepage marketing surface is filtered.
-- Individual /r/[id] permalinks remain accessible for any receipt.

CREATE OR REPLACE FUNCTION public.nexus_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mainnet_calls AS (
    SELECT *
    FROM public.inference_logs
    WHERE status = 'success'
      AND tx_signature IS NOT NULL
      AND (
        receipt_json->'payment'->>'network' LIKE 'solana:5eykt%'
        OR receipt_json->'payment'->>'network' = 'solana:mainnet'
        OR receipt_json->'payment'->>'network' = 'eip155:8453'
      )
  )
  SELECT jsonb_build_object(
    'agents',       (SELECT COUNT(DISTINCT agent_pubkey) FROM mainnet_calls),
    'inferences',   (SELECT COUNT(*) FROM mainnet_calls),
    'settled_usdc', COALESCE((SELECT SUM(cost_usdc) FROM mainnet_calls), 0),
    'paid_calls',   (SELECT COUNT(*) FROM mainnet_calls)
  );
$$;

-- Re-grant after CREATE OR REPLACE (Postgres preserves grants on replace
-- but we re-grant defensively in case a future ALTER drops them).
GRANT EXECUTE ON FUNCTION public.nexus_stats() TO anon, authenticated, service_role;
