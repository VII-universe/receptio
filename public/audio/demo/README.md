# Nahrávky ukázkových hovorů

Struktura: `public/audio/demo/<jazyk>/<obor>.{webm,m4a,json}`

- `<jazyk>`: kód jazyka webu (`cs`, `en`, `sk`, …)
- `<obor>`: `restaurant`, `dental`, `auto`, `salon`

Web při buildu zjistí, které soubory existují (`src/lib/marketing/demo-audio.ts`).
Pro jazyk stránky použije jeho vlastní nahrávku. Když chybí, použije češtinu s titulky
přeloženými po replikách. Stačí přidat soubory a znovu nasadit, kód se neupravuje.

## Audio

Mono, krátké (20–35 s), ideálně dvě verze:

```bash
ffmpeg -i vstup.wav -ac 1 -c:a libopus -b:a 32k -application voip restaurant.webm
ffmpeg -i vstup.wav -ac 1 -c:a aac -b:a 48k -movflags +faststart restaurant.m4a
```

Stačí i jen jedna z nich (`.m4a` přehraje každý prohlížeč).

## Přepis s časováním (`<obor>.json`)

```json
{
  "lang": "cs",
  "duration": 31.3,
  "segments": [
    {
      "speaker": "aida",
      "start": 0.35,
      "end": 8.8,
      "text": "Dobrý den, hovoří s vámi AI asistent. …",
      "words": [{ "w": "Dobrý", "s": 0.35, "e": 0.62 }]
    },
    { "speaker": "caller", "start": 9.2, "end": 13.6, "text": "…" }
  ]
}
```

- `speaker`: `aida` nebo `caller` (podle toho orb mění barvu).
- Časy jsou v sekundách. `words` jsou volitelná. S nimi běží titulky slovo po slovu, bez nich po replikách.
- Počet a pořadí replik musí odpovídat `marketing.demo.scripts.<obor>` v `messages/*.json`.
  Podle toho se ukazují přeložené titulky v ostatních jazycích.
- `"placeholder": true` označuje zástupnou nahrávku. Web pak uživateli řekne, že nejde o hlas Aidy.
  U skutečných nahrávek ho vynechte.

Časování slov z ElevenLabs: endpoint `text-to-speech/{voice_id}/with-timestamps` vrací
časy jednotlivých znaků (`alignment`). Slovo začíná časem prvního znaku a končí časem posledního.

Současné soubory v `cs/` jsou zástupné. Jde o syntetický signál s rytmem řeči, ne TTS ani lidský hlas,
a mají `placeholder: true`.
