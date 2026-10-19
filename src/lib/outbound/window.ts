import { localDate, localParts, zonedToUtc } from '@/lib/bookings/time'

const hhmm = (h: number) => `${String(h).padStart(2, '0')}:00`

/** Nejbližší okamžik uvnitř povoleného okna (místní čas agenta); je-li `now` uvnitř, vrací `now`. */
export function nextAllowedStart(now: Date, tz: string, fromHour: number, toHour: number): Date {
  const p = localParts(now, tz)
  const h = p.hour + p.minute / 60
  if (h >= fromHour && h < toHour) return now
  const today = localDate(now, tz)
  if (h < fromHour) return zonedToUtc(today, hhmm(fromHour), tz)
  const [y, m, d] = today.split('-').map(Number)
  return zonedToUtc(new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10), hhmm(fromHour), tz)
}

/** Čas rezervace pro hlas, např. "středa 22. října 14:00" (v jazyce a časové zóně agenta). */
export function formatWhen(date: Date, tz: string, language: string): string {
  const opts: Intl.DateTimeFormatOptions = { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
  try {
    return new Intl.DateTimeFormat(language, opts).format(date)
  } catch {
    return new Intl.DateTimeFormat('en', opts).format(date)
  }
}
