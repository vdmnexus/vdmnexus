-- Public stats function — returns aggregate metrics over inference_logs.
-- Exposed via the /api/stats route on apps/web. Read-only, no PII; uses
-- a SECURITY DEFINER function instead of a public-RLS view so we can keep
-- inference_logs locked down to service-role-only while still surfacing
-- the cumulative counters every public landing page wants to display.
--
-- Counters returned:
--   agents       — distinct agent_pubkeys with ≥1 successful inference
--   inferences   — total successful inferences (all paths)
--   settled_usdc — sum of cost_usdc across successful inferences
--   paid_calls   — subset of successful inferences settled via x402
--                  (i.e. tx_signature IS NOT NULL — the real on-chain rows)
--
-- Updated callers re-fetch on a 60s s-maxage; the function is cheap
-- enough to recompute every minute even at 10× current volume.

CREATE OR REPLACE FUNCTION public.nexus_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'agents',
      (SELECT COUNT(DISTINCT agent_pubkey)
       FROM public.inference_logs
       WHERE status = 'success'),
    'inferences',
      (SELECT COUNT(*)
       FROM public.inference_logs
       WHERE status = 'success'),
    'settled_usdc',
      COALESCE(
        (SELECT SUM(cost_usdc)
         FROM public.inference_logs
         WHERE status = 'success'),
        0
      ),
    'paid_calls',
      (SELECT COUNT(*)
       FROM public.inference_logs
       WHERE status = 'success' AND tx_signature IS NOT NULL)
  );
$$;

-- Allow the anon role to call it. (The function is SECURITY DEFINER so it
-- runs with the owner's privileges regardless; this just unblocks the
-- public PostgREST RPC endpoint.)
GRANT EXECUTE ON FUNCTION public.nexus_stats() TO anon, authenticated, service_role;
