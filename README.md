# Receptio

AI hlasový recepční pro malé firmy (restaurace, zubaři, kadeřnictví, autoservisy, …).
Receptio zvedá telefony, domlouvá termíny, ukládá přepisy hovorů a přepojuje na člověka, když je potřeba.

## Tech stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Clerk (autentizace)
- Supabase (databáze)
- Vapi, ElevenLabs, Twilio (hlas a telefonie), Resend (emaily)

## Lokální setup

```bash
npm install
cp .env.example .env.local   # a vyplň klíče
npm run dev
```

Aplikace běží na http://localhost:3000.

Bez vyplněných klíčů aplikace běží také: Clerk se zapne, až jsou vyplněné
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` a `CLERK_SECRET_KEY`. Do té doby je `/dashboard`
dostupný jen ve vývojovém režimu; v produkci bez Clerku přesměruje na `/sign-in`.

## Database Setup

1. Vytvoř nový projekt na [supabase.com](https://supabase.com).
2. Zkopíruj Project URL, anon key a service role key do `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Spusť migraci: zkopíruj obsah `supabase/migrations/001_initial_schema.sql`
   do Supabase SQL editoru a spusť ho.

Přístup k datům jde přes server se service role klíčem (`src/lib/supabase/queries.ts`);
RLS je zapnuté a anon/authenticated klienti nemají k tabulkám přístup, kromě čtení `industry_templates`.

## Admin panel

Super-admin panel je na `/admin` (jen pro uživatele s rolí admin). Roli nastavíte v Clerk:

Clerk Dashboard → Users → vybrat uživatele → Metadata → Public Metadata → `{ "role": "admin" }`

Role se čte přímo z Clerk uživatele na serveru (stránky `/admin/*` i `/api/admin/*`), změna platí okamžitě.
Volitelně můžete v Clerk Dashboardu (Sessions → Customize session token) přidat do tokenu
`{ "metadata": "{{user.public_metadata}}" }` – middleware pak ne-adminy odmítne už před vykreslením stránky.

## Struktura

- `src/app/page.tsx` – veřejná landing page
- `src/app/(dashboard)` – chráněné stránky (Clerk auth guard)
- `src/app/(auth)` – přihlášení a registrace
- `src/app/api/webhooks/vapi` – webhooky Vapi
- `src/lib/supabase` – klienti pro browser a server
- `src/types` – sdílené TypeScript typy
