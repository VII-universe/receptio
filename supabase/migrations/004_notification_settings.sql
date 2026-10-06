-- Nastavení notifikací po skončení hovoru (email přes Resend, SMS přes Twilio)
alter table workspaces
  add column if not exists notification_email text,
  add column if not exists notification_phone text,
  add column if not exists notifications_enabled boolean not null default true;
