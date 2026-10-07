/**
 * Překlady e-mailů jsou přímo v šablonách (e-maily se renderují mimo Next.js request kontext, bez next-intl).
 * Podporované jazyky: cs, en, de, pl, sk, fr; ostatní locale se vracejí na angličtinu.
 */
export function pickLocale<T>(table: Record<string, T> & { en: T }, locale: string): T {
  return Object.prototype.hasOwnProperty.call(table, locale) ? table[locale] : table.en
}

/** Jazyk pro Intl (data/čísla): neznámý jazyk e-mailu -> angličtina. */
export const intlLocale = (table: object, locale: string) =>
  Object.prototype.hasOwnProperty.call(table, locale) ? locale : 'en'
