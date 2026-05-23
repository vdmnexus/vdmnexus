-- Atomic debit for /v1/inference.
--
-- Before this migration:
--   route.ts did `getBalance()` (non-locking SUM) → run inference →
--   `debit()` (raw insert). Two concurrent requests for the same agent
--   could both pass the balance check, both run inference, and both
--   debit — overdrafting the ledger by 2x cost.
--
-- This function makes balance check + debit insert atomic per agent
-- pubkey:
--   1. Lock the agents row (SELECT ... FOR UPDATE). Serializes all
--      debit operations on this agent until the transaction commits.
--   2. Sum the ledger inside the locked region.
--   3. If balance >= amount, insert the debit row and return the new
--      balance.
--   4. Otherwise return NULL (insufficient).
--
-- Callers (apps/nexus/lib/credits.ts → `tryDebit`) translate NULL into
-- a 402 insufficient_credits response.
--
-- SECURITY DEFINER so the function runs with table-owner privileges
-- and can lock/insert regardless of the calling role. The service-role
-- key is the only one that calls it from apps/nexus, so the elevated
-- privileges are not exposed to anon callers.

create or replace function public.try_debit_inference(
  p_agent_pubkey text,
  p_amount_usdc numeric,
  p_reason text,
  p_nonce text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
begin
  if p_amount_usdc <= 0 then
    raise exception 'p_amount_usdc must be positive (got %)', p_amount_usdc;
  end if;

  -- Lock the agent row for the duration of this transaction. Any
  -- concurrent invocation against the same agent_pubkey will wait
  -- here until we commit, making balance + debit atomic per agent.
  perform 1
  from public.agents
  where pubkey = p_agent_pubkey
  for update;

  if not found then
    raise exception 'agent_not_registered: %', p_agent_pubkey;
  end if;

  -- Inside the locked region, compute the live balance and decide.
  select coalesce(sum(delta_usdc), 0)
    into v_balance
    from public.credits_ledger
   where agent_pubkey = p_agent_pubkey;

  if v_balance < p_amount_usdc then
    return null;
  end if;

  insert into public.credits_ledger (
    agent_pubkey,
    delta_usdc,
    reason,
    request_nonce
  ) values (
    p_agent_pubkey,
    -abs(p_amount_usdc),
    p_reason,
    p_nonce
  );

  return v_balance - p_amount_usdc;
end;
$$;

revoke all on function public.try_debit_inference(text, numeric, text, text)
  from public, anon, authenticated;

grant execute on function public.try_debit_inference(text, numeric, text, text)
  to service_role;

comment on function public.try_debit_inference(text, numeric, text, text) is
  'Atomic balance check + debit for /v1/inference. Returns the new balance, or NULL if insufficient. Locks the agents row so concurrent requests for the same agent serialize.';
