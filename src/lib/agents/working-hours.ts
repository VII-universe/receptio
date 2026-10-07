import type { WorkingHour } from '@/types'

export const DEFAULT_OUTSIDE_MESSAGE =
  'We are currently closed. Please call back during business hours or leave a message.'

export const MAX_OUTSIDE_MESSAGE = 300

export const TIMEZONES = [
  'Europe/Prague',
  'Europe/Bratislava',
  'Europe/Vienna',
  'Europe/Berlin',
  'Europe/Warsaw',
  'Europe/Budapest',
  'Europe/London',
  'UTC',
] as const

export const isTimezone = (v: unknown): v is (typeof TIMEZONES)[number] =>
  typeof v === 'string' && (TIMEZONES as readonly string[]).includes(v)

// Pořadí zobrazení: od pondělí, neděle poslední (day_of_week: 0 = neděle).
export const DAY_ORDER: { day: number; label: string }[] = [
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
  { day: 6, label: 'Saturday' },
  { day: 0, label: 'Sunday' },
]

const weekday = (d: number): WorkingHour => ({ day_of_week: d, is_open: true, open_time: '08:00', close_time: '17:00' })
const closed = (d: number): WorkingHour => ({ day_of_week: d, is_open: false, open_time: null, close_time: null })

export const DEFAULT_WORKING_HOURS: WorkingHour[] = [closed(0), weekday(1), weekday(2), weekday(3), weekday(4), weekday(5), closed(6)]

/** "08:00:00" (typ time z Postgresu) -> "08:00" */
export const normalizeTime = (t: string | null | undefined): string | null => (t ? t.slice(0, 5) : null)

/** Vždy 7 záznamů (po jednom na den); chybějící dny se doplní z výchozích hodin. */
export function fillWorkingHours(rows: Partial<WorkingHour>[]): WorkingHour[] {
  const byDay = new Map(rows.map((r) => [r.day_of_week, r]))
  return DEFAULT_WORKING_HOURS.map((d) => {
    const r = byDay.get(d.day_of_week)
    if (!r) return d
    return {
      day_of_week: d.day_of_week,
      is_open: r.is_open ?? d.is_open,
      open_time: normalizeTime(r.open_time),
      close_time: normalizeTime(r.close_time),
    }
  })
}
