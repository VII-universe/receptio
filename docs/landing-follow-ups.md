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
- **Cookie `NEXT_LOCALE` bez souhlasu.** Middleware next-intl ji nastavuje při každé návštěvě
  marketingových stránek (`Set-Cookie: NEXT_LOCALE=…`), i bez souhlasu s preferencemi. Web sám si jazyk
  ukládá jen se souhlasem (cookie `locale`). Řešení: `localeCookie: false` v `src/i18n/routing.ts`
  (mění chování middleware, proto mimo landing), nebo ji v zásadách cookies uvést jako nezbytnou.

## Obsah

- **Revize překladů** rodilými mluvčími: viz `docs/translations-review.md`.
- **Skutečné nahrávky** ukázek a hlasů (ElevenLabs): `public/audio/demo/README.md`. Současné
  soubory jsou zástupné a web je tak označuje.

## SEO a výkon

- **`NEXT_PUBLIC_APP_URL` musí v produkci obsahovat finální doménu.** Z ní se skládají kanonické adresy,
  hreflang, sitemap, robots, JSON-LD i adresa obrázku pro sdílení. Lokálně ukazuje na
  receptio-tau.vercel.app, proto Lighthouse na localhostu hlásí „canonical“ (SEO 92); s doménou 100.
- **Root layout přednačítá písmo Geist Sans (29 kB)** i na veřejném webu, který ho nepoužívá, a na pomalém
  mobilu ubírá pásmo CSS. Řešení: `preload: false` u Geist v `src/app/layout.tsx` (dashboard pak písmo
  stáhne až s CSS) nebo přesun Geist do layoutů aplikace.
- **Globální CSS (30 kB) blokuje vykreslení** a obsahuje i třídy dashboardu. Zvážit
  `experimental.inlineCss` v `next.config.ts` (platí pro celou aplikaci) nebo rozdělení stylů.
- **Alt text obrázku pro sdílení je „Receptio“ ve všech jazycích.** Next 15 neumí přeložený alt
  (`generateImageMetadata`) u staticky generovaného obrázku ve složce `[locale]`; build spadne.

## Prostředí

- **Varování buildu „inferred workspace root“** způsobuje soubor `~/package-lock.json` v domovské
  složce, ne projekt. Řešení: soubor odstranit, nebo nastavit `turbopack.root` v `next.config.ts`.
