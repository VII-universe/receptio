// Souhlas s cookies a ukládáním dat v prohlížeči. Volba se pamatuje v cookie `receptio_consent` (180 dní).
// Nezbytné cookies (přihlášení, zabezpečení, uložení této volby) souhlas nevyžadují; souhlas řídí jen "preference"
// (jazyk marketingových stránek a vzhled aplikace). Reklamní ani analytické cookies třetích stran nepoužíváme.

export const CONSENT_COOKIE = 'receptio_consent'
export const CONSENT_EVENT = 'receptio:consent-changed'
export const OPEN_SETTINGS_EVENT = 'receptio:open-cookie-settings'
const MAX_AGE = 60 * 60 * 24 * 180

export interface Consent {
  preferences: boolean
  ts: number
}

export function readConsent(): Consent | null {
  try {
    const raw = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
      ?.slice(CONSENT_COOKIE.length + 1)
    if (!raw) return null
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<Consent>
    return typeof parsed.preferences === 'boolean' ? { preferences: parsed.preferences, ts: Number(parsed.ts) || 0 } : null
  } catch {
    return null
  }
}

/** Smí si aplikace pamatovat preference (jazyk, vzhled)? Bez rozhodnutí uživatele ne. */
export const canStorePreferences = () => readConsent()?.preferences === true

export function writeConsent(preferences: boolean) {
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify({ preferences, ts: Date.now() }))}; path=/; max-age=${MAX_AGE}; samesite=lax`
  // Odvolaný souhlas = smazat už uložené preference.
  if (!preferences) clearPreferences()
  window.dispatchEvent(new Event(CONSENT_EVENT))
}

export function clearPreferences() {
  document.cookie = 'locale=; path=/; max-age=0; samesite=lax'
  try {
    window.localStorage.removeItem('receptio-theme')
  } catch {
    /* úložiště nemusí být dostupné */
  }
}

export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))
