-- Vazba workspace na Clerk Organization (týmy). Organizace se vytváří líně při první pozvánce.
alter table workspaces
  add column if not exists clerk_org_id text unique;
