-- Telefonní čísla agentů (Twilio + Vapi). Sloupec agents.phone_number už existuje z 001.
alter table agents
  add column if not exists phone_number_sid text unique,        -- Twilio SID (PN...)
  add column if not exists vapi_phone_number_id text unique;    -- ID čísla ve Vapi
