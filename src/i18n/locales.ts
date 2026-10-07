import type { Locale } from './routing'

/** Název jazyka v něm samém a vlajka (pro přepínače jazyka). */
export const LOCALE_META: Record<Locale, { name: string; flag: string }> = {
  cs: { name: 'Čeština', flag: '🇨🇿' },
  en: { name: 'English', flag: '🇬🇧' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  pl: { name: 'Polski', flag: '🇵🇱' },
  sk: { name: 'Slovenčina', flag: '🇸🇰' },
  fr: { name: 'Français', flag: '🇫🇷' },
  nl: { name: 'Nederlands', flag: '🇳🇱' },
  bg: { name: 'Български', flag: '🇧🇬' },
  tr: { name: 'Türkçe', flag: '🇹🇷' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  pt: { name: 'Português', flag: '🇵🇹' },
  es: { name: 'Español', flag: '🇪🇸' },
  sv: { name: 'Svenska', flag: '🇸🇪' },
  da: { name: 'Dansk', flag: '🇩🇰' },
  fi: { name: 'Suomi', flag: '🇫🇮' },
  no: { name: 'Norsk', flag: '🇳🇴' },
  ro: { name: 'Română', flag: '🇷🇴' },
  hu: { name: 'Magyar', flag: '🇭🇺' },
  hr: { name: 'Hrvatski', flag: '🇭🇷' },
  et: { name: 'Eesti', flag: '🇪🇪' },
  lv: { name: 'Latviešu', flag: '🇱🇻' },
  lt: { name: 'Lietuvių', flag: '🇱🇹' },
  el: { name: 'Ελληνικά', flag: '🇬🇷' },
}
