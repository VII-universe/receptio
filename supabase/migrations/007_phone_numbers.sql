-- Telefonní čísla workspace. Jeden agent může mít nejvýše jedno číslo,
-- počet čísel na workspace omezuje plán (kontroluje aplikace).
create table if not exists phone_numbers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  twilio_sid text not null unique,
  vapi_phone_number_id text unique,               -- ID čísla ve Vapi (potřeba pro uvolnění)
  phone_number text not null,
  friendly_name text,
  is_active boolean not null default true,
  monthly_cost numeric(10,2) not null default 45.00,
  purchased_at timestamptz not null default now()
);
create index if not exists phone_numbers_workspace_id_idx on phone_numbers(workspace_id);
create index if not exists phone_numbers_agent_id_idx on phone_numbers(agent_id);
-- Pojistka proti souběžné koupi dvou čísel pro jednoho agenta.
create unique index if not exists phone_numbers_one_per_agent_idx
  on phone_numbers(agent_id) where agent_id is not null;

-- Přístup jde přes server (service role); bez RLS by tabulka byla veřejně čitelná přes anon klíč.
alter table phone_numbers enable row level security;

alter table agents
  add column if not exists phone_number_id uuid references phone_numbers(id) on delete set null;

-- Převod čísel zakoupených před touto migrací (sloupce na agents z 003).
insert into phone_numbers (workspace_id, agent_id, twilio_sid, vapi_phone_number_id, phone_number)
select workspace_id, id, phone_number_sid, vapi_phone_number_id, phone_number
from agents
where phone_number_sid is not null and phone_number is not null
on conflict (twilio_sid) do nothing;

update agents a
set phone_number_id = p.id
from phone_numbers p
where p.agent_id = a.id and a.phone_number_id is null;
