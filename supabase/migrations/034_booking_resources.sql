-- Režimy rezervací: kapacitní (počet míst na čas) a zdrojový (konkrétní stůl / křeslo / místnost).
-- Rozšiřuje existující systém (migrace 030), nenahrazuje ho. Bez zdrojů a s kapacitou 1 se chování nemění.

alter table agents
  add column if not exists booking_mode text not null default 'capacity' check (booking_mode in ('capacity', 'resource')),
  add column if not exists booking_capacity integer not null default 1 check (booking_capacity between 1 and 1000),   -- kapacitní režim: míst na jeden čas
  add column if not exists booking_advance_days integer not null default 30 check (booking_advance_days between 1 and 365);

-- Zdroje (stoly, křesla, místnosti, místa…) – jen pro zdrojový režim.
create table if not exists booking_resources (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  type text not null default 'custom' check (type in ('table', 'chair', 'room', 'seat', 'custom')),
  capacity integer not null default 1 check (capacity between 1 and 1000),
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_booking_resources_agent on booking_resources(agent_id, sort_order);
-- Stejně jako ostatní tabulky: RLS zapnuté, přístup jen přes service role na serveru (Clerk, ne Supabase Auth).
alter table booking_resources enable row level security;

alter table bookings
  add column if not exists resource_id uuid references booking_resources(id) on delete set null,
  add column if not exists party_size integer not null default 1 check (party_size between 1 and 1000),
  add column if not exists customer_email text,
  add column if not exists source text not null default 'manual' check (source in ('phone', 'web', 'manual')),
  add column if not exists vapi_call_id text;

-- Nový stav "nedostavil se".
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check check (status in ('pending', 'confirmed', 'cancelled', 'no_show'));

-- Kapacita > 1 dovoluje souběžné rezervace jednoho agenta, proto se pravidlo "žádný překryv na agenta" nahrazuje
-- pravidlem na zdroj + atomickou kontrolou kapacity ve funkci níže.
alter table bookings drop constraint if exists bookings_no_overlap;
alter table bookings add constraint bookings_resource_no_overlap
  exclude using gist (resource_id with =, tstzrange(starts_at, ends_at) with &&)
  where (resource_id is not null and status not in ('cancelled', 'no_show'));
create index if not exists idx_bookings_resource on bookings(resource_id);

-- Atomické vytvoření rezervace: zámek na agenta, kontrola kapacity / zdroje, vložení. Brání souběžnému dvojímu obsazení.
-- Chyba 'slot_unavailable' = čas je obsazený (aplikace ji převede na HTTP 409).
create or replace function create_booking_checked(
  p_agent uuid, p_workspace uuid, p_name text, p_phone text, p_email text,
  p_starts timestamptz, p_ends timestamptz, p_title text, p_notes text, p_status text,
  p_party integer, p_resource uuid, p_source text, p_call_log uuid, p_vapi_call text
) returns bookings
language plpgsql
security invoker
set search_path = public
as $$
declare
  a agents%rowtype;
  rid uuid := p_resource;
  used integer;
  result bookings;
begin
  perform pg_advisory_xact_lock(hashtext(p_agent::text));
  select * into a from agents where id = p_agent and workspace_id = p_workspace;
  if not found then raise exception 'agent_not_found'; end if;

  if a.booking_mode = 'resource' then
    if rid is null then
      select r.id into rid from booking_resources r
       where r.agent_id = p_agent and r.is_active and r.capacity >= p_party
         and not exists (select 1 from bookings b where b.resource_id = r.id and b.status not in ('cancelled', 'no_show') and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts, p_ends))
       order by r.sort_order, r.created_at limit 1;
      if rid is null then raise exception 'slot_unavailable'; end if;
    else
      if not exists (select 1 from booking_resources r where r.id = rid and r.agent_id = p_agent and r.is_active and r.capacity >= p_party) then
        raise exception 'resource_invalid';
      end if;
      if exists (select 1 from bookings b where b.resource_id = rid and b.status not in ('cancelled', 'no_show') and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts, p_ends)) then
        raise exception 'slot_unavailable';
      end if;
    end if;
  else
    rid := null;
    select coalesce(sum(b.party_size), 0) into used from bookings b
     where b.agent_id = p_agent and b.status not in ('cancelled', 'no_show') and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts, p_ends);
    if used + p_party > a.booking_capacity then raise exception 'slot_unavailable'; end if;
  end if;

  insert into bookings (agent_id, workspace_id, caller_name, caller_phone, customer_email, starts_at, ends_at, title, notes, status,
                        confirmed_at, party_size, resource_id, source, call_log_id, vapi_call_id)
  values (p_agent, p_workspace, p_name, p_phone, p_email, p_starts, p_ends, p_title, p_notes, p_status,
          case when p_status = 'confirmed' then now() else null end, p_party, rid, p_source, p_call_log, p_vapi_call)
  returning * into result;
  return result;
end;
$$;
revoke all on function create_booking_checked from public, anon, authenticated;
grant execute on function create_booking_checked to service_role;
