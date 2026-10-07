/** "6. 10. 2026 v 14:32" (česky, časová zóna Praha) */
export function formatCzDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' })
  const time = d.toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague', hour: '2-digit', minute: '2-digit' })
  return `${date} v ${time}`
}

/** "6. 10. 2026" */
export const formatCzDate = (iso: string) =>
  new Date(iso).toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' })

/** +420777123456 -> "+420 777 123 456" (ostatní čísla beze změny) */
export function formatPhone(n: string): string {
  const m = n.match(/^(\+42[01])(\d{3})(\d{3})(\d{3})$/)
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : n
}

export const DEFAULT_APP_URL = 'https://receptio-tau.vercel.app'
export const appBaseUrl = (override?: string) =>
  (override || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/$/, '')
