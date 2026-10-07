-- Jazyk agenta: původní CHECK povoloval jen cs/sk/en, nově libovolný kód ve formátu BCP-47 (cs, de, de-AT, ...).
-- Sloupec agents.language už existuje (001), proto se jen mění omezení.
alter table agents drop constraint if exists agents_language_check;
alter table agents add constraint agents_language_check check (language ~ '^[a-z]{2}(-[A-Z]{2})?$');

alter table agents add column if not exists language_name text not null default 'Čeština';
update agents set language_name = 'Slovenčina' where language = 'sk';
update agents set language_name = 'English' where language = 'en';

-- Čísla v dalších zemích se účtují v USD (Twilio); u starších čísel zůstává původních 45 CZK.
alter table phone_numbers add column if not exists cost_currency text not null default 'CZK';
alter table phone_numbers alter column monthly_cost drop not null;
