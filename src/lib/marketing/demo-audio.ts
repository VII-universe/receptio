import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { DEMO_AUDIO_BASE, DEMO_AUDIO_FORMATS, DEMO_INDUSTRIES, demoFallbackLang, type DemoSource, type DemoTranscript } from './demo'

const PUBLIC_DIR = path.join(process.cwd(), 'public')

function sourceFor(lang: string, industry: DemoSource['industry']): DemoSource | null {
  const base = `${DEMO_AUDIO_BASE}/${lang}/${industry}`
  const transcript = `${base}.json`
  const transcriptFile = path.join(PUBLIC_DIR, transcript)
  if (!existsSync(transcriptFile)) return null
  let placeholder = false
  try {
    placeholder = (JSON.parse(readFileSync(transcriptFile, 'utf8')) as DemoTranscript).placeholder === true
  } catch {
    return null
  }
  const sources = DEMO_AUDIO_FORMATS.filter((f) => existsSync(path.join(PUBLIC_DIR, `${base}.${f.ext}`))).map((f) => ({
    src: `${base}.${f.ext}`,
    type: f.type,
  }))
  return sources.length ? { industry, lang, sources, transcript, placeholder } : null
}

/**
 * Nahrávky ukázek pro jazyk stránky: vlastní nahrávka jazyka, jinak záložní (viz demoFallbackLang).
 * Volá se při statickém vykreslení stránky, takže stačí přidat soubory a znovu sestavit web.
 */
export function getDemoSources(locale: string): DemoSource[] {
  return DEMO_INDUSTRIES.map((industry) => sourceFor(locale, industry) ?? sourceFor(demoFallbackLang(locale), industry)).filter(
    (s): s is DemoSource => s !== null
  )
}
