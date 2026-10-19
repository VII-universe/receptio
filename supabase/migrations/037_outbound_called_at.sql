-- Okamžik, kdy cron hovor zahájil (pending -> calling); podle něj se po 20 minutách bez zprávy od Vapi hovor označí za neúspěšný.
alter table outbound_calls add column called_at timestamptz;
