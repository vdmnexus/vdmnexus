-- Persist the signed receipt JSON and a clean tx_signature column on every
-- inference_logs row. Enables:
--   1. Public single-receipt lookup at GET /api/v1/receipts/<id> without
--      re-signing on every read (signature stays bit-stable).
--   2. /r/<inference_id> permalinks on apps/web for receipts minted outside
--      the playground sponsor agent.
--   3. Future public-index page over recent receipts.
--
-- Why a separate tx_signature column instead of reusing request_nonce:
-- the existing chat/completions route currently writes settled.transaction
-- into request_nonce, which is semantically wrong (request_nonce was the
-- agent's per-call nonce for /v1/inference). New code writes the real
-- on-chain signature into tx_signature; request_nonce stays UUIDs from
-- the prepaid path only. Both columns are nullable so historical rows
-- stay valid without backfill.

ALTER TABLE public.inference_logs
  ADD COLUMN IF NOT EXISTS receipt_json jsonb,
  ADD COLUMN IF NOT EXISTS tx_signature text;

-- Speed up tx_signature lookups (sparse — only x402 rows have it).
CREATE INDEX IF NOT EXISTS inference_logs_tx_signature_idx
  ON public.inference_logs (tx_signature)
  WHERE tx_signature IS NOT NULL;

-- Speed up listing recent successful receipts for the index page.
CREATE INDEX IF NOT EXISTS inference_logs_success_created_idx
  ON public.inference_logs (created_at DESC)
  WHERE status = 'success';
