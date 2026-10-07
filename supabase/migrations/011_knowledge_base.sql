-- Strukturované informace o firmě, které se kompilují do system promptu agenta (a posílají do Vapi).
-- RLS politika ze zadání odkazovala na neexistující clerk_org_id / workspace_members / auth.uid(),
-- proto je RLS zapnuté bez politiky: přístup k datům jde výhradně přes server (service role).
create table if not exists knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  category text not null check (category in ('basic_info', 'hours', 'services', 'faq', 'custom')),
  title text not null,
  content text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_knowledge_entries_agent on knowledge_entries(agent_id, sort_order);
create index if not exists idx_knowledge_entries_workspace on knowledge_entries(workspace_id);

alter table knowledge_entries enable row level security;

create trigger update_knowledge_entries_updated_at
  before update on knowledge_entries
  for each row execute function update_updated_at_column();

-- Kdy se znalostní báze naposledy odeslala do Vapi
alter table agents add column if not exists knowledge_synced_at timestamptz;
