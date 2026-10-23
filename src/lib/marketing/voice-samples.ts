// Ukázky hlasů pro sekci „Zní jako člověk“: stejná věta pro každý hlas z katalogu a oba tóny.
// Soubory: public/audio/voice/<jazyk>/<hlas>-<tón>.{m4a,mp3}, kde <hlas> je první slovo názvu
// z VOICE_CATALOG malými písmeny (charlotte, sarah, daniel…). manifest.json { "placeholder": true }
// označí zástupné nahrávky. Dostupnost se zjišťuje při buildu (voice-samples.server.ts).

export const VOICE_TONES = ['formal', 'friendly'] as const
export type VoiceTone = (typeof VOICE_TONES)[number]

export const VOICE_AUDIO_BASE = '/audio/voice'

/** Klíč hlasu podle názvu v katalogu: „Charlotte (female)“ → „charlotte“. */
export const voiceKey = (catalogName: string) => catalogName.split(/[\s(]/)[0].toLowerCase()

export interface VoiceSamples {
  /** Jazyk nahrávek (může se lišit od jazyka stránky). */
  lang: string
  placeholder: boolean
  /** `${voiceKey}-${tone}` → zdroje v pořadí, ve kterém je prohlížeč zkouší */
  clips: Record<string, { src: string; type: string }[]>
}
