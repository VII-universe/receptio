-- Upozornění k rezervacím: SMS zákazníkovi (potvrzení, zrušení, změna, připomenutí) a sledování odeslaných zpráv.
alter table agents
  add column if not exists booking_notify_customer boolean not null default true;

alter table bookings
  add column if not exists reminder_sent_at timestamptz,           -- připomenutí den předem už odešlo
  add column if not exists customer_notified_status text;          -- 'confirmed' | 'cancelled': o čem už byl zákazník informován

-- Cron připomenutí hledá potvrzené rezervace v nejbližších hodinách, které ještě nemají odeslané připomenutí.
create index if not exists idx_bookings_reminder on bookings(starts_at) where status = 'confirmed' and reminder_sent_at is null;
