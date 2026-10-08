// Pomocné funkce pro práci s lokálním časem agenta (IANA časová zóna) bez externí knihovny.

const pad = (n: number) => String(n).padStart(2, '0')

/** Rozloží okamžik na lokální datum a čas v dané zóně. */
export function localParts(instant: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') }
}

/** "YYYY-MM-DD" lokálního dne v dané zóně. */
export function localDate(instant: Date, tz: string): string {
  const p = localParts(instant, tz)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** "HH:MM" lokálního času v dané zóně. */
export function localTime(instant: Date, tz: string): string {
  const p = localParts(instant, tz)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

/** Lokální datum + čas v zóně -> UTC okamžik (řeší i přechod na letní čas). */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const asUtc = Date.UTC(y, m - 1, d, hh, mm)
  // Odhad a oprava o rozdíl zóny v odhadnutém okamžiku (dvě iterace pokryjí přechody DST).
  let guess = asUtc
  for (let i = 0; i < 2; i++) {
    const p = localParts(new Date(guess), tz)
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
    guess += asUtc - shown
  }
  return new Date(guess)
}

/** Den v týdnu (0 = neděle) pro "YYYY-MM-DD". */
export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
}

export const isDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export const isTime = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)

/** "08:00:00" -> "08:00" */
export const hhmm = (t: string) => t.slice(0, 5)

export const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
export const fromMinutes = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`

/** Rozdělí interval na bloky po lokálních dnech v zóně: [{ date, start: 'HH:MM', end: 'HH:MM' }]. */
export function splitByLocalDay(start: Date, end: Date, tz: string): { date: string; start: string; end: string }[] {
  const out: { date: string; start: string; end: string }[] = []
  let cursor = start
  for (let i = 0; i < 400 && cursor < end; i++) {
    const date = localDate(cursor, tz)
    const [y, m, d] = date.split('-').map(Number)
    const next = new Date(Date.UTC(y, m - 1, d + 1, 12))
    const nextDate = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
    const dayEnd = zonedToUtc(nextDate, '00:00', tz)
    const segEnd = end < dayEnd ? end : dayEnd
    const endLabel = segEnd.getTime() === dayEnd.getTime() ? '23:59' : localTime(segEnd, tz)
    const startLabel = localTime(cursor, tz)
    if (endLabel > startLabel) out.push({ date, start: startLabel, end: endLabel })
    cursor = dayEnd
  }
  return out
}

/** Posun "YYYY-MM-DD" o n dní. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n, 12))
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/** Pondělí týdne, do kterého datum patří. */
export function weekStart(date: string): string {
  return addDays(date, -((dayOfWeek(date) + 6) % 7))
}

/** PostgREST hlásí chybějící tabulku (neprovedená migrace) kódem PGRST205, přímý Postgres kódem 42P01. */
export const isMissingTable = (code?: string | null) => code === 'PGRST205' || code === '42P01'
