-- Jazyk rozhraní dashboardu (nastavení workspace). Marketing stránky mají locale v URL.
alter table workspaces
  add column if not exists locale text not null default 'cs'
    check (locale in ('cs','en','de','pl','sk','fr','nl','bg','tr'));
