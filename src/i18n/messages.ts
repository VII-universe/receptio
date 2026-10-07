import type { Locale } from './routing'

type Messages = Record<string, unknown>

const isObject = (v: unknown): v is Messages => typeof v === 'object' && v !== null && !Array.isArray(v)

function merge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base }
  for (const [k, v] of Object.entries(override)) {
    out[k] = isObject(v) && isObject(base[k]) ? merge(base[k] as Messages, v) : v
  }
  return out
}

/**
 * Překlady jazyka s doplněním chybějících klíčů z angličtiny, takže nepřeložený text
 * se zobrazí anglicky, ne jako prázdný klíč.
 */
export async function loadMessages(locale: Locale | string): Promise<Messages> {
  const en = (await import('../../messages/en.json')).default as Messages
  if (locale === 'en') return en
  try {
    const own = (await import(`../../messages/${locale}.json`)).default as Messages
    return merge(en, own)
  } catch {
    return en
  }
}
