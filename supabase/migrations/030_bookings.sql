-- Rezervace, napojení externích kalendářů a dostupnost agentů.
-- Naše DB je zdroj pravdy; externí kalendáře jsou volitelná synchronizace.

-- Nastavení rezervací u agenta. Výchozí vypnuto: stávající agenti se chovají beze změny.
alter table agents
  add column if not exists booking_enabled boolean not null default false,
  add column if not exists booking_auto_confirm boolean not null default true;

-- =====================
-- CALENDAR_CONNECTIONS (napojení na Google / iCal / CalDAV)
-- =====================
create table calendar_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null check (provider in ('google', 'ical', 'caldav')),
  name text not null,
  config jsonb not null default '{}',              -- tokeny a URL; šifrované, pokud je nastaven CALENDAR_ENCRYPTION_KEY
  sync_enabled boolean not null default true,
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now()
);
create index idx_calendar_connections_workspace on calendar_connections(workspace_id);

-- =====================
-- BOOKINGS
-- =====================
create table bookings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  external_id text,                                 -- ID události v externím kalendáři
  calendar_connection_id uuid references calendar_connections(id) on delete set null,
  caller_name text not null,
  caller_phone text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  title text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  call_log_id uuid references call_logs(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
-- Dvě aktivní rezervace stejného agenta se nesmí překrývat (ochrana před souběžným zápisem).
create extension if not exists btree_gist;
alter table bookings add constraint bookings_no_overlap
  exclude using gist (agent_id with =, tstzrange(starts_at, ends_at) with &&) where (status <> 'cancelled');

create index idx_bookings_workspace_starts on bookings(workspace_id, starts_at);
create index idx_bookings_agent_starts on bookings(agent_id, starts_at);

-- =====================
-- AVAILABILITY_SLOTS
-- Opakující se okno (day_of_week) nebo jednorázové (date). is_available = false je blokovaný čas.
-- =====================
create table availability_slots (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  day_of_week smallint check (day_of_week between 0 and 6),   -- 0 = neděle
  date date,
  start_time time not null,
  end_time time not null,
  slot_duration_minutes integer not null default 30 check (slot_duration_minutes between 5 and 240),
  is_available boolean not null default true,
  note text,
  external_source uuid references calendar_connections(id) on delete cascade, -- blok importovaný z externího kalendáře
  created_at timestamptz not null default now(),
  check (day_of_week is not null or date is not null),
  check (end_time > start_time)
);
create index idx_availability_agent on availability_slots(agent_id);
create index idx_availability_agent_date on availability_slots(agent_id, date);

-- Stejně jako call_logs: RLS zapnuté, přístup jen přes service role na serveru.
alter table calendar_connections enable row level security;
alter table bookings enable row level security;
alter table availability_slots enable row level security;
