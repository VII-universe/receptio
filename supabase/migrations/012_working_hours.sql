-- Pracovní doba agentů (kompiluje se do system promptu ve Vapi).
-- Výchozí řádky pro existující agenty doplňuje aplikace, ne migrace.
create table if not exists working_hours (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0 = neděle, 1 = pondělí ... 6 = sobota
  is_open boolean not null default true,
  open_time time,   -- NULL = celý den
  close_time time,  -- NULL = celý den
  unique (agent_id, day_of_week)
);
create index if not exists idx_working_hours_workspace on working_hours(workspace_id);

-- Přístup jde přes server (service role); RLS bez politiky, jako u ostatních tabulek.
alter table working_hours enable row level security;

alter table agents
  add column if not exists timezone text not null default 'Europe/Prague',
  add column if not exists outside_hours_message text
    default 'Momentálně nepracujeme. Zavolejte prosím v pracovní době nebo zanechte vzkaz.';
