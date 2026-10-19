-- Vlastní tajemství webhooku pro každého agenta (Vapi ho posílá v hlavičce x-vapi-secret).
-- NULL = starší agent, který stále používá sdílené VAPI_WEBHOOK_SECRET, dokud se mu secret nedoplní (viz npm run vapi:backfill-secrets).
alter table agents add column vapi_webhook_secret text;
