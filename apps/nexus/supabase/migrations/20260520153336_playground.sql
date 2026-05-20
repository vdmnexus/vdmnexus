-- Playground (Phase 0): receipts, per-IP rate limit, daily sponsor spend.

CREATE TABLE public.playground_receipts (
  id text PRIMARY KEY,
  receipt jsonb NOT NULL,
  prompt text NOT NULL,
  response text NOT NULL,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX playground_receipts_created_at_idx
  ON public.playground_receipts (created_at DESC);

CREATE TABLE public.playground_rate_limit (
  ip_hash text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX playground_rate_limit_window_idx
  ON public.playground_rate_limit (window_start);

CREATE TABLE public.playground_daily_spend (
  utc_day date PRIMARY KEY,
  cost_usdc numeric(12,6) NOT NULL DEFAULT 0
);

ALTER TABLE public.playground_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playground_rate_limit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playground_daily_spend ENABLE ROW LEVEL SECURITY;
