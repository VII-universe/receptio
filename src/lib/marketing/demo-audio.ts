import 'server-only'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { DEMO_AUDIO_BASE, DEMO_AUDIO_FORMATS, DEMO_FALLBACK_LANG, DEMO_INDUSTRIES, type DemoSource } from './demo'

const PUBLIC_DIR = path.join(process.cwd(), 'public')

function sourceFor(lang: string, industry: DemoSource['industry']): DemoSource | null {
  const base = `${DEMO_AUDIO_BASE}/${lang}/${industry}`
  const transcript = `${base}.json`
  if (!existsSync(path.join(PUBLIC_DIR, transcript))) return null
  const sources = DEMO_AUDIO_FORMATS.filter((f) => existsSync(path.join(PUBLIC_DIR, `${base}.${f.ext}`))).map((f) => ({
    src: `${base}.${f.ext}`,
    type: f.type,
  }))
  return sources.length ? { industry, lang, sources, transcript } : null
}

/**
 * Nahrávky ukázek pro jazyk stránky: vlastní nahrávka jazyka, jinak záložní (čeština).
 * Volá se při statickém vykreslení stránky, takže stačí přidat soubory a znovu sestavit web.
 */
export function getDemoSources(locale: string): DemoSource[] {
  return DEMO_INDUSTRIES.map((industry) => sourceFor(locale, industry) ?? sourceFor(DEMO_FALLBACK_LANG, industry)).filter(
    (s): s is DemoSource => s !== null
  )
}
