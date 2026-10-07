alter table workspaces
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists business_type text,
  add column if not exists business_name text;

-- Workspace vzniklé před onboardingem ho už mají za sebou (spouštět jen jednou, při zavedení sloupce).
update workspaces set onboarding_completed = true;
