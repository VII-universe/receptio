-- 14denní zkušební verze bez karty (plán Starter). trial_used brání opakování trialu po novém založení workspace;
-- trial_reminder_sent_at brání opakovanému odesílání upozornění na konec trialu.
alter table workspaces
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_used boolean not null default false,
  add column if not exists trial_reminder_sent_at timestamptz;
