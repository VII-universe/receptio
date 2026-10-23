# Nahrávky ukázkových hovorů

Struktura: `public/audio/demo/<jazyk>/<obor>.{m4a,mp3,json}`

- `<jazyk>`: kód jazyka webu (`cs`, `en`, `sk`, …)
- `<obor>`: `restaurant`, `dental`, `auto`, `salon`

Web při buildu zjistí, které soubory existují (`src/lib/marketing/demo-audio.ts`).
Pro jazyk stránky použije jeho vlastní nahrávku. Když chybí, použije záložní jazyk
(`demoFallbackLang` v `src/lib/marketing/demo.ts`: slovenština češtinu, ostatní angličtinu)
s titulky přeloženými po replikách a poznámkou „ukázka v češtině / v angličtině“.
Stačí přidat soubory a znovu nasadit, kód se neupravuje.

Nahrané jazyky: `cs`, `en`.

## Generování (ElevenLabs)

```bash
node --env-file=.env.local scripts/generate-demo-audio.mjs --lang cs,en            # hovory i ukázky hlasů
node --env-file=.env.local scripts/generate-demo-audio.mjs --lang sk --only demo   # jen hovory
```

- Texty bere z `messages/<jazyk>.json` (`marketing.demo.scripts`, `marketing.voice.sample`).
- Aida má jeden stálý hlas z katalogu produktu, volající v každém oboru jiný hlas (střídavě muž a žena).
  Hlasy a nastavení tónu jsou nahoře ve skriptu.
- Každá replika se generuje zvlášť přes `text-to-speech/{voice_id}/with-timestamps`, pak se slepí
  do jednoho souboru (hlasitost srovnaná na -18 LUFS, pauza mezi replikami).
- Odpovědi se ukládají do `node_modules/.cache/elevenlabs`, opakovaný běh je zdarma (`--force` znovu).
- Výslovnost bez změny titulků: čas „14:30“ čte český hlas slovy, jméno „Aida“ má v angličtině
  fonetický zápis (funkce `spoken` ve skriptu).

## Audio

Jeden soubor na ukázku, mono: `.m4a` (AAC 64 kb/s, metadata na začátku souboru) a `.mp3` jako záloha.
Přehrávač načítá jen metadata (`preload="metadata"`), zbytek až při přehrání.

## Přepis s časováním (`<obor>.json`)

```json
{
  "lang": "cs",
  "duration": 26.65,
  "segments": [
    {
      "speaker": "aida",
      "start": 0.25,
      "end": 8.21,
      "text": "Dobrý den, hovoří s vámi AI asistent. …",
      "words": [{ "w": "Dobrý", "s": 0.25, "e": 0.69 }]
    },
    { "speaker": "caller", "start": 8.93, "end": 11.8, "text": "…" }
  ]
}
```

- `speaker`: `aida` nebo `caller` (podle toho orb mění barvu).
- Časy jsou v sekundách. `words` jsou volitelná. S nimi běží titulky slovo po slovu, bez nich po replikách.
- Počet a pořadí replik musí odpovídat `marketing.demo.scripts.<obor>` v `messages/*.json`.
  Podle toho se ukazují přeložené titulky v ostatních jazycích.
- `"placeholder": true` by označilo zástupnou nahrávku (web pak řekne, že nejde o hlas Aidy).
  Skutečné nahrávky ho nemají.

Ukázky hlasů pro sekci „Zní jako člověk“ leží v `public/audio/voice/<jazyk>/<hlas>-<tón>.{m4a,mp3}`
(viz `src/lib/marketing/voice-samples.ts`).
