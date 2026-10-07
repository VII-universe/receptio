-- Rozšíření call_logs. Většina sloupců už existuje (001), IF NOT EXISTS je neškodné.
-- Funkci increment_minutes_used NEPŘEPISUJEME: verze z 005 řeší reset fakturačního období
-- a je zamčená jen pro service role.
alter table call_logs
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists transcript text,
  add column if not exists transcript_json jsonb,        -- jen repliky user/assistant (bez system promptu)
  add column if not exists recording_url text,
  add column if not exists caller_number text,
  add column if not exists ended_reason text,
  add column if not exists cost numeric(10,4),           -- USD
  add column if not exists summary text;

create index if not exists idx_call_logs_started_at on call_logs(started_at desc);
