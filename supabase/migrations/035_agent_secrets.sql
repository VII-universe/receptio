-- Tajemství webhooku agenta patří do samostatné tabulky: kód často čte agenty přes select('*') a vrací je klientovi,
-- takže sloupec přímo v agents (029) by se dřív nebo později dostal do prohlížeče. Tady ho žádný dotaz na agenty nevrátí.
-- Agent bez řádku v agent_secrets je starší agent, který dál používá sdílené VAPI_WEBHOOK_SECRET (npm run vapi:backfill-secrets).
-- Sloupec agents.vapi_webhook_secret z 029 se nepoužívá (zůstává prázdný); případně ho lze později smazat.
create table agent_secrets (
  agent_id uuid primary key references agents(id) on delete cascade,
  vapi_webhook_secret text not null,
  created_at timestamptz not null default now()
);

-- Stejně jako ostatní tabulky: RLS zapnuté bez politik, přístup jen přes service role na serveru.
alter table agent_secrets enable row level security;
