-- Logo podniku: soubor je ve Storage (bucket workspace-logos, vytvoří se při prvním nahrání), sem se ukládá jeho veřejná adresa.
alter table workspaces add column if not exists logo_url text;
