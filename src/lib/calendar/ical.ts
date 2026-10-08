import 'server-only'
import ICAL from 'ical.js'
import { safeFetchText } from './net'
import { bookingIdFromUid, type CalendarProviderClient, type ExternalEvent } from './types'

const MAX_OCCURRENCES = 1000

/** Rozparsuje text .ics na události v okně [from, to] (včetně opakovaných). Sdílí ho iCal feed i CalDAV. */
export function parseIcs(text: string, from: Date, to: Date, idOverride?: string): ExternalEvent[] {
  const out: ExternalEvent[] = []
  let root: InstanceType<typeof ICAL.Component>
  try {
    root = new ICAL.Component(ICAL.parse(text))
  } catch {
    return out
  }
  // VTIMEZONE z feedu, aby se časy s TZID správně převedly.
  for (const tz of root.getAllSubcomponents('vtimezone')) {
    try {
      ICAL.TimezoneService.register(tz)
    } catch {
      /* neplatná zóna – událost se vezme jako plovoucí čas */
    }
  }
  const fromT = ICAL.Time.fromJSDate(from, true)
  const toT = ICAL.Time.fromJSDate(to, true)

  for (const vevent of root.getAllSubcomponents('vevent')) {
    const ev = new ICAL.Event(vevent)
    // Přesunuté výskyty opakované události (RECURRENCE-ID) řeší iterátor rodiče.
    if (vevent.hasProperty('recurrence-id')) continue
    const status = String(vevent.getFirstPropertyValue('status') ?? '').toUpperCase()
    const transparent = String(vevent.getFirstPropertyValue('transp') ?? '').toUpperCase() === 'TRANSPARENT'
    const uid = ev.uid
    const bookingId = bookingIdFromUid(uid)
    const allDay = ev.startDate.isDate
    const base = { bookingId, allDay, cancelled: status === 'CANCELLED', transparent }

    if (ev.isRecurring()) {
      const it = ev.iterator()
      let next: InstanceType<typeof ICAL.Time> | null
      for (let n = 0; n < MAX_OCCURRENCES && (next = it.next()); n++) {
        if (next.compare(toT) >= 0) break
        const d = ev.getOccurrenceDetails(next)
        if (d.endDate.compare(fromT) <= 0) continue
        out.push({ ...base, id: `${uid}#${next.toString()}`, start: d.startDate.toJSDate(), end: d.endDate.toJSDate() })
      }
    } else {
      const start = ev.startDate.toJSDate()
      const end = ev.endDate ? ev.endDate.toJSDate() : new Date(start.getTime() + (allDay ? 86_400_000 : 0))
      if (end <= from || start >= to) continue
      out.push({ ...base, id: idOverride ?? uid, start, end })
    }
  }
  return out
}

/** Sestaví .ics s jednou událostí (pro zápis do CalDAV). */
export function buildIcs(opts: { uid: string; summary: string; description?: string; start: Date; end: Date; status: 'CONFIRMED' | 'TENTATIVE' }): string {
  const cal = new ICAL.Component(['vcalendar', [], []])
  cal.updatePropertyWithValue('prodid', '-//Receptio//Bookings//EN')
  cal.updatePropertyWithValue('version', '2.0')
  const vevent = new ICAL.Component('vevent')
  vevent.updatePropertyWithValue('uid', opts.uid)
  vevent.updatePropertyWithValue('summary', opts.summary)
  if (opts.description) vevent.updatePropertyWithValue('description', opts.description)
  vevent.updatePropertyWithValue('dtstamp', ICAL.Time.fromJSDate(new Date(), true))
  vevent.updatePropertyWithValue('dtstart', ICAL.Time.fromJSDate(opts.start, true))
  vevent.updatePropertyWithValue('dtend', ICAL.Time.fromJSDate(opts.end, true))
  vevent.updatePropertyWithValue('status', opts.status)
  cal.addSubcomponent(vevent)
  return cal.toString()
}

/** iCal feed (.ics URL): jen čtení. */
export function icalClient(config: { url: string }): CalendarProviderClient {
  return {
    canWrite: false,
    async fetchEvents(from, to) {
      const text = await safeFetchText(config.url, { headers: { Accept: 'text/calendar, text/plain, */*' } })
      if (!text.includes('BEGIN:VCALENDAR')) throw new Error('The address does not return an iCal calendar')
      return parseIcs(text, from, to)
    },
  }
}
