import { isLanguageCode } from '@/lib/languages'

export interface VapiLocaleConfig {
  /** Deepgram transcriber language code */
  transcriberLanguage: string
  /** Je jazyk podporovaný přepisem řeči (Deepgram nova-2)? Nepodporované jazyky se agentovi nenabízejí. */
  transcriberSupported: boolean
  /** ElevenLabs voice model */
  voiceModel: 'eleven_multilingual_v2' | 'eleven_turbo_v2_5'
  /** BCP-47 jazyk pro TTS (ElevenLabs ho ve Vapi vynucuje jen u Turbo v2.5; jinak informativní) */
  ttsLanguage: string
  /** Název jazyka v tomto jazyce */
  nativeName: string
}

const M = 'eleven_multilingual_v2' as const

/** Locale aplikace (23 jazyků) -> nastavení Vapi asistenta (přepis + hlas). */
export const VAPI_LOCALE_MAP: Record<string, VapiLocaleConfig> = {
  cs: { transcriberLanguage: 'cs', transcriberSupported: true, voiceModel: M, ttsLanguage: 'cs-CZ', nativeName: 'čeština' },
  en: { transcriberLanguage: 'en', transcriberSupported: true, voiceModel: 'eleven_turbo_v2_5', ttsLanguage: 'en-US', nativeName: 'English' },
  de: { transcriberLanguage: 'de', transcriberSupported: true, voiceModel: M, ttsLanguage: 'de-DE', nativeName: 'Deutsch' },
  pl: { transcriberLanguage: 'pl', transcriberSupported: true, voiceModel: M, ttsLanguage: 'pl-PL', nativeName: 'polski' },
  sk: { transcriberLanguage: 'sk', transcriberSupported: true, voiceModel: M, ttsLanguage: 'sk-SK', nativeName: 'slovenčina' },
  fr: { transcriberLanguage: 'fr', transcriberSupported: true, voiceModel: M, ttsLanguage: 'fr-FR', nativeName: 'français' },
  nl: { transcriberLanguage: 'nl', transcriberSupported: true, voiceModel: M, ttsLanguage: 'nl-NL', nativeName: 'Nederlands' },
  it: { transcriberLanguage: 'it', transcriberSupported: true, voiceModel: M, ttsLanguage: 'it-IT', nativeName: 'italiano' },
  pt: { transcriberLanguage: 'pt', transcriberSupported: true, voiceModel: M, ttsLanguage: 'pt-PT', nativeName: 'português' },
  es: { transcriberLanguage: 'es', transcriberSupported: true, voiceModel: M, ttsLanguage: 'es-ES', nativeName: 'español' },
  sv: { transcriberLanguage: 'sv', transcriberSupported: true, voiceModel: M, ttsLanguage: 'sv-SE', nativeName: 'svenska' },
  da: { transcriberLanguage: 'da', transcriberSupported: true, voiceModel: M, ttsLanguage: 'da-DK', nativeName: 'dansk' },
  fi: { transcriberLanguage: 'fi', transcriberSupported: true, voiceModel: M, ttsLanguage: 'fi-FI', nativeName: 'suomi' },
  no: { transcriberLanguage: 'no', transcriberSupported: true, voiceModel: M, ttsLanguage: 'nb-NO', nativeName: 'norsk' },
  ro: { transcriberLanguage: 'ro', transcriberSupported: true, voiceModel: M, ttsLanguage: 'ro-RO', nativeName: 'română' },
  hu: { transcriberLanguage: 'hu', transcriberSupported: true, voiceModel: M, ttsLanguage: 'hu-HU', nativeName: 'magyar' },
  // Chorvatštinu Deepgram nova-2 (ani typy Vapi SDK) nezná: agent by volajícímu nerozuměl, proto se nenabízí.
  hr: { transcriberLanguage: 'hr', transcriberSupported: false, voiceModel: M, ttsLanguage: 'hr-HR', nativeName: 'hrvatski' },
  et: { transcriberLanguage: 'et', transcriberSupported: true, voiceModel: M, ttsLanguage: 'et-EE', nativeName: 'eesti' },
  lv: { transcriberLanguage: 'lv', transcriberSupported: true, voiceModel: M, ttsLanguage: 'lv-LV', nativeName: 'latviešu' },
  lt: { transcriberLanguage: 'lt', transcriberSupported: true, voiceModel: M, ttsLanguage: 'lt-LT', nativeName: 'lietuvių' },
  bg: { transcriberLanguage: 'bg', transcriberSupported: true, voiceModel: M, ttsLanguage: 'bg-BG', nativeName: 'български' },
  tr: { transcriberLanguage: 'tr', transcriberSupported: true, voiceModel: M, ttsLanguage: 'tr-TR', nativeName: 'Türkçe' },
  el: { transcriberLanguage: 'el', transcriberSupported: true, voiceModel: M, ttsLanguage: 'el-GR', nativeName: 'ελληνικά' },
}

/** Konfigurace pro locale nebo kód jazyka agenta ("de-AT" -> "de"); neznámý kód -> angličtina. */
export function getVapiLocale(locale: string): VapiLocaleConfig {
  return VAPI_LOCALE_MAP[locale] ?? VAPI_LOCALE_MAP[locale.split('-')[0]] ?? VAPI_LOCALE_MAP['en']
}

/**
 * Jazyk nového agenta podle locale workspace. Pokud ho agent nemůže mluvit (např. hr bez podpory přepisu),
 * výchozí je angličtina. Existujícím agentům se jazyk podle změny locale NEMĚNÍ.
 */
export function agentLanguageForLocale(locale: string | null | undefined): string {
  return locale && isLanguageCode(locale) && getVapiLocale(locale).transcriberSupported ? locale : 'en'
}
