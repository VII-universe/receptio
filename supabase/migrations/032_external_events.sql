-- Události z napojených kalendářů (Google, iCal, CalDAV) zobrazené v kalendáři Receptio a blokující dostupnost,
-- a tajný odkaz pro odběr kalendáře Receptio v jiných aplikacích (iCal feed).

create table external_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  connection_id uuid not null references calendar_connections(id) on delete cascade,
  external_id text not null,
  title text,                                  -- null u soukromých událostí
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  transparent boolean not null default false,  -- "volno": událost nebrání rezervaci
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index idx_external_events_workspace_range on external_events(workspace_id, starts_at, ends_at);
create index idx_external_events_connection on external_events(connection_id);
alter table external_events enable row level security;

alter table workspaces add column if not exists calendar_feed_token text;
create unique index if not exists idx_workspaces_calendar_feed_token on workspaces(calendar_feed_token) where calendar_feed_token is not null;
