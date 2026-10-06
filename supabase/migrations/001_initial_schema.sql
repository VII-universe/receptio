-- Receptio: initial schema
-- Spusť v Supabase SQL editoru. Auth řeší Clerk, Supabase slouží jen jako databáze.

create extension if not exists "uuid-ossp";

-- =====================
-- WORKSPACES (každý zákazník = jedna firma)
-- =====================
create table workspaces (
  id uuid primary key default uuid_generate_v4(),
  clerk_user_id text not null unique,   -- Clerk user, který workspace vlastní
  name text not null,
  industry text not null check (industry in (
    'restaurant', 'dentist', 'hair_salon', 'auto_repair',
    'veterinary', 'law_firm', 'fitness', 'other'
  )),
  website_url text,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================
-- AGENTS (AI recepční patřící k workspace)
-- =====================
create table agents (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null default 'Aida',
  vapi_agent_id text unique,
  phone_number text,
  language text not null default 'cs' check (language in ('cs', 'sk', 'en')),
  is_active boolean not null default false,
  business_hours jsonb not null default '{
    "monday":    {"open": true,  "from": "08:00", "to": "17:00"},
    "tuesday":   {"open": true,  "from": "08:00", "to": "17:00"},
    "wednesday": {"open": true,  "from": "08:00", "to": "17:00"},
    "thursday":  {"open": true,  "from": "08:00", "to": "17:00"},
    "friday":    {"open": true,  "from": "08:00", "to": "17:00"},
    "saturday":  {"open": false, "from": "09:00", "to": "13:00"},
    "sunday":    {"open": false, "from": "09:00", "to": "13:00"}
  }',
  fallback_phone text,
  notification_email text,
  notification_phone text,
  greeting_message text,
  faq jsonb default '[]',               -- [{"question": "...", "answer": "..."}]
  custom_instructions text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================
-- CALL LOGS
-- =====================
create table call_logs (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references agents(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  vapi_call_id text unique not null,
  caller_number text,
  duration_seconds integer default 0,
  status text not null check (status in (
    'completed', 'missed', 'transferred', 'failed', 'in_progress'
  )),
  summary text,
  transcript text,
  recording_url text,
  cost_cents integer default 0,
  ended_reason text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- =====================
-- SUBSCRIPTIONS (Stripe)
-- =====================
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade unique,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'starter' check (plan in ('starter', 'business', 'pro')),
  status text not null default 'trialing' check (status in (
    'trialing', 'active', 'canceled', 'past_due', 'incomplete'
  )),
  minutes_included integer not null default 100,
  minutes_used integer not null default 0,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================
-- INDUSTRY TEMPLATES
-- =====================
create table industry_templates (
  id uuid primary key default uuid_generate_v4(),
  industry text not null,
  language text not null default 'cs',
  name text not null,
  greeting_message text not null,
  custom_instructions text not null,
  faq jsonb not null default '[]',
  is_default boolean default false,
  created_at timestamptz default now()
);

-- =====================
-- INDEXES
-- (workspaces.clerk_user_id a call_logs.vapi_call_id už indexuje UNIQUE constraint)
-- =====================
create index idx_agents_workspace_id on agents(workspace_id);
create index idx_call_logs_agent_id on call_logs(agent_id);
create index idx_call_logs_workspace_id on call_logs(workspace_id);
create index idx_call_logs_created_at on call_logs(created_at desc);
create index idx_industry_templates_lookup on industry_templates(industry, language);

-- =====================
-- UPDATED_AT TRIGGERS
-- =====================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_workspaces_updated_at
  before update on workspaces
  for each row execute function update_updated_at_column();

create trigger update_agents_updated_at
  before update on agents
  for each row execute function update_updated_at_column();

create trigger update_subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at_column();

-- =====================
-- ROW LEVEL SECURITY
-- Veškerý přístup k datům jde přes server se service_role klíčem (obchází RLS).
-- Tabulky s RLS a bez policy jsou pro anon/authenticated zcela zamčené.
-- Výjimka: šablony oborů jsou veřejně čitelné.
-- =====================
alter table workspaces enable row level security;
alter table agents enable row level security;
alter table call_logs enable row level security;
alter table subscriptions enable row level security;
alter table industry_templates enable row level security;

create policy "Industry templates are readable by all"
  on industry_templates for select
  using (true);

-- =====================
-- SEED: industry templates (cs)
-- =====================
insert into industry_templates (industry, language, name, greeting_message, custom_instructions, faq, is_default) values
(
  'dentist', 'cs', 'Zubní ordinace',
  'Dobrý den, voláte do zubní ordinace [název firmy]. Jsem Aida, váš virtuální asistent. Jak vám mohu pomoci?',
  'Pomáháš s objednáním termínu a informuješ o spolupracujících pojišťovnách a cenách. Při zubní bolesti nebo jiné urgenci okamžitě předej hovor recepci nebo lékaři. Nezodpovídáš zdravotní dotazy a nedáváš lékařské rady.',
  '[
    {"question": "S jakými pojišťovnami spolupracujete?", "answer": "Spolupracujeme s většinou zdravotních pojišťoven. Konkrétní pojišťovnu vám rádi potvrdí na recepci."},
    {"question": "Kolik stojí preventivní prohlídka?", "answer": "Preventivní prohlídka je hrazena zdravotní pojišťovnou v rámci běžné péče. Případné nadstandardní služby vám upřesní recepce."},
    {"question": "Co dělat při akutní bolesti zubu?", "answer": "Při akutní bolesti vás okamžitě přepojím na recepci nebo lékaře, aby vás co nejdříve ošetřili."}
  ]'::jsonb,
  true
),
(
  'restaurant', 'cs', 'Restaurace',
  'Dobrý den, voláte do restaurace [název firmy]. Jsem Aida. Chcete rezervovat stůl nebo se zeptat na menu?',
  'Přijímáš rezervace stolů, informuješ o menu a otevírací době. Dotazy na alergeny vždy eskaluj na personál, sama je nezodpovídej.',
  '[
    {"question": "Jak mohu rezervovat stůl?", "answer": "Rezervaci vám ráda zapíšu hned. Potřebuji datum, čas, počet osob a vaše jméno s telefonním číslem."},
    {"question": "Jaká je vaše otevírací doba?", "answer": "Otevírací dobu vám sdělím podle nastavení restaurace. Řekněte mi, na který den se ptáte."},
    {"question": "Je možné zaparkovat u restaurace?", "answer": "Informace o parkování vám upřesní personál. Ráda vám je předám nebo vám je pošlu ve zprávě."}
  ]'::jsonb,
  true
),
(
  'hair_salon', 'cs', 'Kadeřnictví',
  'Dobrý den, voláte do kadeřnictví [název firmy]. Jsem Aida. Chcete se objednat nebo se zeptat na ceny?',
  'Přijímáš objednávky ke konkrétním kadeřníkům, informuješ o cenách a dostupnosti termínů. Pokud si zákazník není jistý službou, nabídni zavolání zpět od kadeřníka.',
  '[
    {"question": "Kolik stojí střih?", "answer": "Cena střihu závisí na délce vlasů a zvoleném kadeřníkovi. Orientační ceník vám ráda sdělím."},
    {"question": "Jak se mohu objednat?", "answer": "Objednám vás hned. Řekněte mi preferovaný den a čas, případně konkrétního kadeřníka."},
    {"question": "Jaká je vaše otevírací doba?", "answer": "Otevírací dobu vám sdělím podle nastavení kadeřnictví. Na který den se ptáte?"}
  ]'::jsonb,
  true
),
(
  'auto_repair', 'cs', 'Autoservis',
  'Dobrý den, voláte do autoservisu [název firmy]. Jsem Aida. Jak vám mohu pomoci?',
  'Přijímáš objednávky na servis a orientačně informuješ o cenách. Složitější technické dotazy předávej mechanikovi. Nikdy neslibuj závaznou cenu bez prohlídky vozu.',
  '[
    {"question": "Kolik stojí výměna oleje?", "answer": "Cena výměny oleje se liší podle typu vozu a použitého oleje. Orientační cenu vám řeknu podle značky a modelu."},
    {"question": "Jak se mohu objednat na servis?", "answer": "Objednám vás hned. Potřebuji značku a model vozu, SPZ, důvod návštěvy a vyhovující termín."},
    {"question": "Zajišťujete STK?", "answer": "Informaci o STK a přípravě vozu vám upřesní mechanik. Ráda vás na něj přepojím nebo si vyžádám zpětné zavolání."}
  ]'::jsonb,
  true
);
