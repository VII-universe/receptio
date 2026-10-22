# Úkoly mimo landing page

Při práci na novém veřejném webu (větev `feat/landing-nocni-smena`) se našly věci, které patří
do produktu nebo do provozu, ne na web. Landing je záměrně neřeší. Tady je seznam na později.

## Produkt

- **Lokalizace SMS po hovoru.** `src/lib/twilio/notifications.ts` (`buildCallSms`) posílá text vždy
  anglicky („Receptio: New call from …“). E-mailové shrnutí je přeložené podle jazyka workspace
  (`src/emails/call-summary.tsx`), SMS by mělo totéž.
- **SMS podle plánu se nevynucuje.** `src/lib/notifications/send-call-notification.ts` pošle SMS
  každému workspace s vyplněným číslem, včetně plánu Starter a zkušební doby. Ceník uvádí SMS jen
  u Business a Pro, takže web nic nepravdivého netvrdí, ale chování produktu tomu neodpovídá.
- **Chorvatské oznámení o AI.** `src/lib/agents/disclosure.ts` nemá `hr`, chorvatský agent proto
  oznámí AI anglicky. Web uvádí chorvatskou větu.

## Právní a provoz

- **Smlouvy o zpracování (DPA) a standardní smluvní doložky** ověřit u Vapi, ElevenLabs a Twilio.
- **Zásady ochrany osobních údajů** jmenovitě neuvádějí partnery Vapi, ElevenLabs a Twilio, web ano.
  Doplnit je do zásad (`src/content/legal/privacy.ts`).
- **DPH u cen.** Ceník neuvádí, jestli jsou ceny s DPH, nebo bez. Rozhodnout a doplnit
  (texty `marketing.pricing`).
- **Údaje provozovatele.** Patička zobrazí provozovatele z `NEXT_PUBLIC_LEGAL_NAME` a
  `NEXT_PUBLIC_LEGAL_ID`, dokud chybí, řádek je skrytý.

## Obsah

- **Revize překladů** rodilými mluvčími: viz `docs/translations-review.md`.
- **Skutečné nahrávky** ukázek a hlasů (ElevenLabs): `public/audio/demo/README.md`. Současné
  soubory jsou zástupné a web je tak označuje.

## Prostředí

- **Varování buildu „inferred workspace root“** způsobuje soubor `~/package-lock.json` v domovské
  složce, ne projekt. Řešení: soubor odstranit, nebo nastavit `turbopack.root` v `next.config.ts`.
