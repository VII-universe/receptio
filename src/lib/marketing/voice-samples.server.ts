import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { VOICE_CATALOG } from '@/lib/agents/voices'
import { DEMO_AUDIO_FORMATS, DEMO_FALLBACK_LANG } from './demo'
import { VOICE_AUDIO_BASE, VOICE_TONES, voiceKey, type VoiceSamples } from './voice-samples'

const PUBLIC_DIR = path.join(process.cwd(), 'public')

function samplesFor(lang: string): VoiceSamples | null {
  const dir = path.join(PUBLIC_DIR, VOICE_AUDIO_BASE, lang)
  if (!existsSync(dir)) return null
  const clips: VoiceSamples['clips'] = {}
  for (const v of VOICE_CATALOG) {
    for (const tone of VOICE_TONES) {
      const key = `${voiceKey(v.name)}-${tone}`
      const sources = DEMO_AUDIO_FORMATS.filter((f) => existsSync(path.join(dir, `${key}.${f.ext}`))).map((f) => ({
        src: `${VOICE_AUDIO_BASE}/${lang}/${key}.${f.ext}`,
        type: f.type,
      }))
      if (sources.length) clips[key] = sources
    }
  }
  if (!Object.keys(clips).length) return null
  let placeholder = false
  try {
    placeholder = (JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8')) as { placeholder?: boolean }).placeholder === true
  } catch {
    // bez manifestu jde o skutečné nahrávky
  }
  return { lang, placeholder, clips }
}

/** Nahrávky hlasů pro jazyk stránky, jinak záložní jazyk (čeština); null, když žádné nejsou. */
export const getVoiceSamples = (locale: string): VoiceSamples | null => samplesFor(locale) ?? samplesFor(DEMO_FALLBACK_LANG)
