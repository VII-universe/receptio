// Ukázkové hovory Aidy (hero, karty odvětví). Nahrávky leží v public/audio/demo/<jazyk>/<odvětví>.*,
// viz public/audio/demo/README.md. Které jazyky mají nahrávku, se zjistí při buildu (demo-audio.ts),
// takže nová nahrávka se začne používat bez úpravy kódu.

export const DEMO_INDUSTRIES = ['restaurant', 'dental', 'auto', 'salon'] as const
export type DemoIndustry = (typeof DEMO_INDUSTRIES)[number]

/**
 * Jazyk nahrávky pro stránku, která vlastní nahrávku nemá: slovenština češtinu, ostatní jazyky angličtinu.
 * Titulky jsou pak přeložené po replikách a ukázka je označená („ukázka v angličtině“).
 */
export const demoFallbackLang = (locale: string) => (locale === 'sk' ? 'cs' : 'en')

export const DEMO_AUDIO_BASE = '/audio/demo'

/** Formáty v pořadí, ve kterém je prohlížeč zkouší: AAC (m4a, metadata na začátku souboru), MP3 jako záloha. */
export const DEMO_AUDIO_FORMATS = [
  { ext: 'm4a', type: 'audio/mp4; codecs="mp4a.40.2"' },
  { ext: 'mp3', type: 'audio/mpeg' },
] as const

export type Speaker = 'aida' | 'caller'

/** Přepis nahrávky s časováním (sekundy). Slova jsou volitelná; bez nich se titulky ukazují po replikách. */
export interface DemoTranscript {
  lang: string
  duration: number
  /** Zástupná nahrávka (syntetický signál místo hlasu); web to u ukázky přizná. */
  placeholder?: boolean
  segments: { speaker: Speaker; start: number; end: number; text: string; words?: { w: string; s: number; e: number }[] }[]
}

export interface DemoSource {
  industry: DemoIndustry
  /** Jazyk nahrávky; když se liší od jazyka stránky, titulky jsou přeložené po replikách. */
  lang: string
  sources: { src: string; type: string }[]
  transcript: string
  /** Zástupná nahrávka (podle příznaku v přepisu). */
  placeholder: boolean
}
