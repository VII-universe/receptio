-- Výchozí časová zóna workspace (nové agenty ji dědí).
alter table workspaces
  add column if not exists timezone text not null default 'Europe/Prague';
