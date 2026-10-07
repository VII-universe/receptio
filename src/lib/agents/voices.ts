// Hlasy ElevenLabs. Model eleven_multilingual_v2 zvládá všechny podporované jazyky, takže každý
// hlas lze použít u každého jazyka; pro jazyk se jen nabízí rozumný výchozí hlas.

export interface Voice {
  id: string
  name: string
}

export const VOICE_CATALOG: Voice[] = [
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte (ženský)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (ženský)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (mužský)' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie (mužský)' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (mužský)' },
]

const CHARLOTTE = 'XB0fDUnXU5powFXDhCwa' // dosavadní výchozí hlas češtiny
const SARAH = 'EXAVITQu4vr4xnSDxMaL'

export const DEFAULT_VOICES: Record<string, string> = {
  cs: CHARLOTTE,
  sk: CHARLOTTE,
  en: SARAH,
  de: CHARLOTTE,
  'de-AT': CHARLOTTE,
  pl: 'IKne3meq5aSn9XLyUdCD', // Charlie
}

/** Výchozí hlas jazyka; pro ostatní jazyky Sarah (zákazník si hlas může změnit ručně). */
export const defaultVoiceFor = (language: string): string => DEFAULT_VOICES[language] ?? SARAH
