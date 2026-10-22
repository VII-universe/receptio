# Revize překladů veřejného webu (namespace `marketing`)

Texty nového landing page jsou v `messages/<jazyk>.json` pod klíčem `marketing`.
Zdrojem pravdy je čeština (`cs`). Změna textu = upravit češtinu a pak všechny jazyky.

Po každé úpravě spusťte `npm run i18n:marketing -- --fix`. Skript ověří, že všechny jazyky mají
stejné klíče, proměnné a tagy jako čeština a že jde o platné ICU zprávy, a doplní typografii.

| Jazyk | Kód | Stav |
|---|---|---|
| čeština | `cs` | zdroj, hotovo |
| angličtina | `en` | plná kvalita, hotovo (zároveň záložní jazyk pro chybějící klíče) |
| slovenština | `sk` | plná kvalita, hotovo |
| němčina, polština, francouzština, italština, španělština, portugalština, nizozemština, švédština, dánština, norština, finština, estonština, lotyština, litevština, maďarština, rumunština, chorvatština, bulharština, řečtina, turečtina | `de pl fr it es pt nl sv da no fi et lv lt hu ro hr bg el tr` | **přeloženo, čeká na revizi rodilým mluvčím** |

Portugalština je psaná v evropské variantě (pt-PT), norština v bokmålu.

## Co zkontrolovat (podle priority)

Klíče platí pro všech 20 jazyků k revizi. Cesty jsou relativní k `marketing.`.

### P1: právní a pravdivostní texty (musí sedět přesně)

- `security.items.db.text`, `security.items.partners.text`: formulace o databázi v EU a o partnerech v USA má odpovídat zásadám ochrany osobních údajů (kapitola V GDPR, standardní smluvní doložky). Použijte místní oficiální názvy (DSGVO, RGPD, RODO, AVG, ΓΚΠΔ, BDAR, VDAR…).
- `faq.items.data.a`, `faq.items.ai.a`: totéž; citace oznámení o AI musí doslova odpovídat větě, kterou říká produkt (`src/lib/agents/disclosure.ts`).
- `demo.scripts.*[0]`: první věta každé ukázky je oznámení o AI. Musí doslova odpovídat `disclosure.ts`. Automaticky ověřeno pro všechny jazyky kromě `hr` (viz níže).
- `pricing.trial.text`, `pricing.faq.overage.a`, `pricing.faq.cancel.a`, `faq.items.cancel.a`, `faq.items.overage.a`: chování zkušební doby, minut navíc a zrušení.
- `faq.items.number.a`, `how.steps.s2.text`: nová čísla jsou jen v podporovaných zemích (`src/lib/countries.ts`). Pro `bg el et lv lt no tr` je proto text „kde je to dostupné“.
- `calculator.note`: musí být jasné, že jde o orientační výpočet, ne o statistiku.
- `footer.operator`: místní název identifikačního čísla firmy.

### P2: hlavní sdělení (tón, přirozenost, délka)

- `meta.title`, `meta.description`, `meta.ogAlt`
- `hero.eyebrow`, `hero.title` (obsahuje `<em>…</em>`, zvýrazněná část má být pointa), `hero.subtitle`, `hero.perks[]`
- `story.title`, `story.intro`, `story.calls.c1–c6.scene` (krátké, filmové věty)
- `how.title`, `how.steps.*`
- `industries.title`, `industries.items.*.scenario`
- `voice.title`, `voice.text`, `voice.sample.formal`, `voice.sample.friendly` (formální a přátelský tón se má zřetelně lišit, ale zůstat zdvořilý)
- `calculator.title`, `pricing.title`, `finalCta.title`, `finalCta.text`

### P3: ostatní

Ukázkové konverzace (`demo.scripts.*`), karty příběhu (`story.calls.*`), popisky ovládání (`demo.*`, `nav.*`), ukázky UI (`how.mock.*`), ceník (`pricing.*`), FAQ (`faq.items.*.q`), patička (`footer.*`).

## Na co si dát pozor

- **ICU syntax**: proměnné `{count}`, `{price}`, `{plan}`, `{name}`, `{year}`, `{id}`, `{text}`, `{starter}`, `{business}`, `{pro}` a tagy `<em>` nesmí zmizet ani se přejmenovat. Plurály (`{count, plural, …}`) používají kategorie daného jazyka.
- **Uvozovky**: `common.quote` určuje uvozovky jazyka („…“, “…”, «…», »…«…).
- **Typografie**: nezlomitelné mezery po jednopísmenných předložkách (cs, sk, pl) a francouzské mezery před `? ! : ;` doplňuje `npm run i18n:marketing -- --fix` automaticky. Do zdrojových textů je nepište ručně.
- **Fiktivní jména a firmy** (Bistro, ordinace, autoservis, salon, jména zákazníků) jsou lokalizovaná. Ověřte, že nepůsobí jako skutečná známá firma.
- **Délka**: nadpisy jsou velké (až 7rem). Výrazně delší překlad nadpisu zkontrolujte na stránce na mobilu (375 px).

## Známý nesoulad v produktu (mimo web)

- `hr`: `src/lib/agents/disclosure.ts` nemá chorvatské oznámení, takže chorvatský agent ho řekne anglicky. Web uvádí chorvatskou větu. Opravit v produktu (doplnit `hr` do `DISCLOSURES`), ne na webu.
