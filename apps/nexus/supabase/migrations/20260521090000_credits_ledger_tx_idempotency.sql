-- Backfill the unique index that makes deposit credits idempotent.
--
-- The index has lived in prod since the credits_ledger table was first
-- created (via the Supabase dashboard, never captured in a migration).
-- apps/nexus/app/api/v1/deposits/scan/route.ts catches Postgres error
-- code 23505 (unique violation) from this index to skip already-credited
-- transactions on repeated cron scans.
--
-- Without this DDL in version control, a fresh database rebuild (or a new
-- branch / preview env) would silently allow the same on-chain deposit to
-- be credited multiple times. CREATE UNIQUE INDEX IF NOT EXISTS is a safe
-- no-op against the existing prod index.

CREATE UNIQUE INDEX IF NOT EXISTS credits_ledger_tx_idx
  ON public.credits_ledger (tx_signature)
  WHERE tx_signature IS NOT NULL;
