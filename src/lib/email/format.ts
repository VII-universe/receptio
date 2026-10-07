/** "6 Oct 2026 at 14:32" (časová zóna Praha) */
export function formatEmailDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { timeZone: 'Europe/Prague', day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { timeZone: 'Europe/Prague', hour: '2-digit', minute: '2-digit' })
  return `${date} at ${time}`
}

/** Datum a čas v jazyce příjemce (časová zóna Praha), např. "6. 10. 2026 14:32". Neznámé locale -> angličtina. */
export function formatLocalizedDateTime(date: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone: 'Europe/Prague', dateStyle: 'medium', timeStyle: 'short' }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en', { timeZone: 'Europe/Prague', dateStyle: 'medium', timeStyle: 'short' }).format(date)
  }
}

/** "6 Oct 2026" */
export const formatEmailDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Europe/Prague', day: 'numeric', month: 'short', year: 'numeric' })

/** +420777123456 -> "+420 777 123 456" (ostatní čísla beze změny) */
export function formatPhone(n: string): string {
  const m = n.match(/^(\+42[01])(\d{3})(\d{3})(\d{3})$/)
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : n
}

export const DEFAULT_APP_URL = 'https://receptio-tau.vercel.app'
export const appBaseUrl = (override?: string) =>
  (override || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/$/, '')
