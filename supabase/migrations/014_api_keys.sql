-- API klíče pro veřejné REST API. Klíč se ukládá jen jako bcrypt hash; vyhledává se podle prefixu
-- ("rcp_live_" + prvních 8 hex znaků), který se zobrazuje v UI.
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  last_used_at timestamptz,
  expires_at timestamptz,                         -- NULL = nevyprší
  is_active boolean not null default true,
  scopes text[] not null default array['read'],   -- 'read' | 'write'
  -- okno pro rate limiting (max. 100 požadavků za minutu na klíč)
  window_start timestamptz,
  window_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_api_keys_workspace on api_keys(workspace_id);
create index if not exists idx_api_keys_prefix on api_keys(key_prefix);

-- Přístup jde přes server (service role); bez RLS by hashe byly čitelné přes anon klíč.
alter table api_keys enable row level security;

-- Atomicky zaznamená použití klíče a vrátí počet požadavků v aktuální minutě.
create or replace function api_key_hit(p_key_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.api_keys
  set
    last_used_at = now(),
    window_count = case
      when window_start is null or window_start <= now() - interval '1 minute' then 1
      else window_count + 1
    end,
    window_start = case
      when window_start is null or window_start <= now() - interval '1 minute' then now()
      else window_start
    end
  where id = p_key_id
  returning window_count into v_count;
  return v_count;
end;
$$;

revoke execute on function api_key_hit(uuid) from public, anon, authenticated;
grant execute on function api_key_hit(uuid) to service_role;
