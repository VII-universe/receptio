-- Odchozí připomínací hovory: šablony, fronta hovorů a souhlas s informováním zákazníků (GDPR) per agent.
-- Plánování a odesílání běží ve Vercel Cron (/api/cron/outbound), ne v pg_cron: endpoint volá Vapi a potřebuje serverová tajemství.

-- Šablona: kdy a co agent zákazníkovi zavolá. message_template je první věta hovoru, proměnné {{customer_name}}, {{business_name}}, {{time}}.
create table outbound_templates (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  trigger_type text not null check (trigger_type in ('after_booking', 'before_booking')),
  delay_hours integer not null default 24 check (delay_hours between 0 and 720),
  message_template text not null,
  allowed_hours_from integer not null default 8 check (allowed_hours_from between 0 and 23),
  allowed_hours_to integer not null default 20 check (allowed_hours_to between 1 and 24),
  active boolean not null default true,
  active_since timestamptz not null default now(),    -- rezervace vytvořené dřív se automaticky nevolají
  created_at timestamptz not null default now(),
  check (allowed_hours_to > allowed_hours_from)
);
create index on outbound_templates(agent_id);
create index on outbound_templates(workspace_id);

-- Fronta a historie hovorů. Řádek vzniká z rezervace (cron) nebo ručně přes API; unikátnost (šablona, rezervace) brání dvojímu volání.
create table outbound_calls (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  template_id uuid references outbound_templates(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  phone_number text not null,
  customer_name text not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'calling', 'completed', 'failed', 'cancelled')),
  call_sid text,                                       -- ID hovoru ve Vapi
  error_message text,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index outbound_calls_template_booking on outbound_calls(template_id, booking_id) where template_id is not null and booking_id is not null;
create index outbound_calls_due on outbound_calls(scheduled_at) where status = 'pending';
create index outbound_calls_workspace_created on outbound_calls(workspace_id, created_at desc);
create index outbound_calls_call_sid on outbound_calls(call_sid) where call_sid is not null;

-- Souhlas s informováním zákazníků o automatických připomínkách (jeden řádek na agenta).
create table outbound_settings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null unique references agents(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  gdpr_confirmed boolean not null default false,
  gdpr_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on outbound_settings(workspace_id);

-- Stejně jako ostatní tabulky: RLS zapnuté bez politik, přístup jen přes service role na serveru.
alter table outbound_templates enable row level security;
alter table outbound_calls enable row level security;
alter table outbound_settings enable row level security;
