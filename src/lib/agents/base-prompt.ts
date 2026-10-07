import { getLanguage } from '@/lib/languages'

/**
 * Přidá na konec promptu pokyn k jazyku, napsaný v cílovém jazyce (např. "Du MUSST ausschließlich
 * auf Deutsch antworten…"). Doplňuje se při každé kompilaci promptu, takže odpovídá aktuálně
 * zvolenému jazyku agenta a uživatel o něj úpravou textu nepřijde.
 */
export function appendLanguageInstruction(prompt: string, languageCode: string): string {
  const { instruction } = getLanguage(languageCode)
  return `${prompt.trim()}\n\n${instruction}`
}
