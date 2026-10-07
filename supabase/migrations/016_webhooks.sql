-- Zákaznické webhooky: po ukončeném hovoru pošle Receptio podepsaný POST na URL zákazníka.
-- Secret se ukládá v plaintextu (potřebujeme ho k podpisu každého požadavku).
create table if not exists webhooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  url text not null,
  secret text not null,                       -- HMAC signing secret generovaný serverem
  events text[] not null default array['call.completed'],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_triggered_at timestamptz,
  last_status_code int,
  failure_count int not null default 0
);
create index if not exists idx_webhooks_workspace on webhooks(workspace_id);

-- RLS MUSÍ být zapnuté (bez politik): tabulka obsahuje podpisové klíče a bez RLS by byla čitelná
-- přes veřejný anon klíč. Server používá service role, která RLS obchází.
alter table webhooks enable row level security;
