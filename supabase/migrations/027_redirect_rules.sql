-- Pravidla přesměrování hovorů a chování příchozích hovorů agenta.
create type redirect_trigger_type as enum ('rings_no_answer', 'call_duration', 'human_request', 'outside_hours');
create type redirect_action_type as enum ('transfer_number', 'play_message_hangup', 'voicemail');

create table redirect_rules (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  priority int not null,                                -- nižší číslo = dřív; použije se první vyhovující pravidlo
  trigger_type redirect_trigger_type not null,
  trigger_config jsonb not null default '{}'::jsonb,    -- např. {"rings": 4} nebo {"minutes": 5}
  action_type redirect_action_type not null,
  action_config jsonb not null default '{}'::jsonb,     -- např. {"number": "+420..."} nebo {"message": "..."}
  created_at timestamptz not null default now()
);

create index on redirect_rules(agent_id, priority);
create index on redirect_rules(workspace_id);

-- Stejně jako ostatní tabulky: RLS zapnuté, přístup jen přes service role na serveru.
alter table redirect_rules enable row level security;

-- rings_before_answer: 0 = ihned. max_call_duration_minutes: výchozí 10 (stejně jako dosavadní výchozí limit Vapi), NULL = bez limitu.
alter table agents
  add column rings_before_answer int not null default 0 check (rings_before_answer between 0 and 4),
  add column max_call_duration_minutes int default 10 check (max_call_duration_minutes is null or max_call_duration_minutes between 1 and 720);
