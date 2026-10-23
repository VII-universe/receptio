// Adresy veřejného webu pro SEO (kanonické adresy, hreflang, sitemap, JSON-LD).

import { LOCALES, routing, type Locale } from '@/i18n/routing'

/** Kořen webu bez lomítka na konci. V produkci NEXT_PUBLIC_APP_URL (finální doména). */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://receptio.dev').replace(/\/$/, '')

/** Stránky veřejného webu (interní cesty z routing.pathnames). */
export type MarketingPath = '/' | '/cennik' | '/privacy' | '/terms' | '/cookies'

/** Veřejná cesta stránky v jazyce, např. ('/cennik', 'de') → /de/preise. */
export function localizedPath(path: MarketingPath, locale: Locale): string {
  const entry = routing.pathnames[path]
  const local = typeof entry === 'string' ? entry : entry[locale]
  return `/${locale}${local === '/' ? '' : local}`
}

/** Právní texty existují jen česky a anglicky; ostatní jazyky ukazují anglickou verzi. */
export const LEGAL_LOCALES: Locale[] = ['cs', 'en']
const isLegal = (path: MarketingPath) => path === '/privacy' || path === '/terms' || path === '/cookies'

/** Jazyky, ve kterých má stránka vlastní obsah (pro hreflang a sitemap). */
export const pageLocales = (path: MarketingPath): readonly Locale[] => (isLegal(path) ? LEGAL_LOCALES : LOCALES)

/**
 * Kanonická adresa a hreflang odkazy stránky. Právní stránka v jazyce bez vlastního textu
 * odkazuje kanonicky na anglickou verzi (obsah je stejný).
 */
export function pageAlternates(path: MarketingPath, locale: Locale) {
  const locales = pageLocales(path)
  const canonicalLocale = locales.includes(locale) ? locale : 'en'
  const languages: Record<string, string> = {}
  for (const l of locales) languages[l] = localizedPath(path, l)
  // x-default: kořen webu sám vybere jazyk podle prohlížeče, ostatní stránky odkazují na angličtinu
  languages['x-default'] = path === '/' ? '/' : localizedPath(path, 'en')
  return { canonical: localizedPath(path, canonicalLocale), languages }
}

/** Kód pro og:locale (jazyk_ZEMĚ). */
const OG_LOCALE: Record<Locale, string> = {
  cs: 'cs_CZ', en: 'en_US', de: 'de_DE', pl: 'pl_PL', sk: 'sk_SK', fr: 'fr_FR', nl: 'nl_NL', bg: 'bg_BG',
  tr: 'tr_TR', it: 'it_IT', pt: 'pt_PT', es: 'es_ES', sv: 'sv_SE', da: 'da_DK', fi: 'fi_FI', no: 'nb_NO',
  ro: 'ro_RO', hu: 'hu_HU', hr: 'hr_HR', et: 'et_EE', lv: 'lv_LV', lt: 'lt_LT', el: 'el_GR',
}
export const ogLocale = (locale: Locale) => OG_LOCALE[locale]
