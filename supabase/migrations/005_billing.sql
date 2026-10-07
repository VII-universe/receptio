alter table workspaces
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan text not null default 'free',
  add column if not exists plan_status text not null default 'active',
  add column if not exists minutes_used integer not null default 0,
  add column if not exists minutes_limit integer not null default 30,       -- -1 = neomezeno
  add column if not exists billing_period_start timestamptz,
  add column if not exists billing_period_end timestamptz;

create unique index if not exists idx_workspaces_stripe_customer_id
  on workspaces(stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists idx_workspaces_stripe_subscription_id
  on workspaces(stripe_subscription_id) where stripe_subscription_id is not null;

-- Atomický přírůstek spotřebovaných minut. Pokud fakturační období neexistuje nebo skončilo
-- (typicky plán Zdarma), začne nový kalendářní měsíc a počítadlo se vynuluje.
create or replace function increment_minutes_used(p_workspace_id uuid, p_minutes integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.workspaces
  set
    minutes_used = case
      when billing_period_end is null or billing_period_end <= now() then p_minutes
      else minutes_used + p_minutes
    end,
    billing_period_start = case
      when billing_period_end is null or billing_period_end <= now() then date_trunc('month', now())
      else billing_period_start
    end,
    billing_period_end = case
      when billing_period_end is null or billing_period_end <= now() then date_trunc('month', now()) + interval '1 month'
      else billing_period_end
    end
  where id = p_workspace_id;
end;
$$;

-- Funkce v schématu public je jinak volatelná přes anon klíč – smí ji volat jen server.
revoke execute on function increment_minutes_used(uuid, integer) from public, anon, authenticated;
grant execute on function increment_minutes_used(uuid, integer) to service_role;
