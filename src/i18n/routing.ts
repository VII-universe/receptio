import { defineRouting } from 'next-intl/routing'

export const LOCALES = ['cs', 'en', 'de', 'pl', 'sk', 'fr', 'nl', 'bg', 'tr', 'it', 'pt', 'es', 'sv', 'da', 'fi', 'no', 'ro', 'hu', 'hr', 'et', 'lv', 'lt', 'el'] as const
export type Locale = (typeof LOCALES)[number]

export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as readonly string[]).includes(v)

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: 'cs',
  localePrefix: 'always',
  pathnames: {
    '/': '/',
    // Ceník: interní adresa je /cennik (složka app/[locale]/cennik), veřejná se liší podle jazyka.
    '/cennik': {
      cs: '/cennik',
      en: '/pricing',
      de: '/preise',
      pl: '/cennik',
      sk: '/cennik',
      fr: '/tarifs',
      nl: '/prijzen',
      bg: '/ceni',
      tr: '/fiyatlar',
      it: '/prezzi',
      pt: '/precos',
      es: '/precios',
      sv: '/priser',
      da: '/priser',
      fi: '/hinnat',
      no: '/priser',
      ro: '/preturi',
      hu: '/arak',
      hr: '/cijene',
      et: '/hinnad',
      lv: '/cenas',
      lt: '/kainos',
      el: '/times',
    },
  },
})
