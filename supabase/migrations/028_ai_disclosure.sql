-- Oznámení volajícímu na začátku hovoru, že hovor obsluhuje AI a může být nahráván (výchozí zapnuto).
alter table agents add column ai_disclosure_enabled boolean not null default true;
