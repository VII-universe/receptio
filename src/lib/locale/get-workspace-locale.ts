import 'server-only'
import { cookies } from 'next/headers'
import { isLocale, routing, type Locale } from '@/i18n/routing'
import { resolveWorkspaceContext } from '@/lib/workspace-context'

/**
 * Jazyk rozhraní dashboardu. Pořadí: nastavení workspace (zdroj pravdy, platí pro celý tým),
 * pak cookie `locale` (nepřihlášený nebo workspace bez nastavení), nakonec výchozí jazyk.
 * Cookie je jen záloha: při přepnutí uživatelů na jednom prohlížeči by jinak přebila nastavení jejich workspace.
 */
export async function getWorkspaceLocale(): Promise<Locale> {
  try {
    const ctx = await resolveWorkspaceContext()
    const fromDb = ctx?.workspace.locale
    if (isLocale(fromDb)) return fromDb
  } catch {
    // mimo kontext požadavku (např. build) – pokračujeme záložkou
  }
  try {
    const fromCookie = (await cookies()).get('locale')?.value
    if (isLocale(fromCookie)) return fromCookie
  } catch {
    /* bez cookies */
  }
  return routing.defaultLocale
}
