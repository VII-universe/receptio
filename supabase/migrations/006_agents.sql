-- Tabulka agents už existuje (001) a drží i telefonní čísla (003), proto zde jen přidáváme
-- sloupce pro správu více agentů. Index agents(workspace_id) a zapnuté RLS už také existují.
-- Přístup k datům jde přes server (service role); RLS bez policy zůstává uzamčené pro anon/authenticated.
alter table agents
  add column if not exists voice_id text,                 -- ElevenLabs voice ID
  add column if not exists system_prompt text,            -- zálohovaná kopie promptu z Vapi
  add column if not exists end_call_phrases text[] not null default '{}';
