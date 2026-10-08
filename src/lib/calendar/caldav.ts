import 'server-only'
import { createDAVClient, type DAVCalendar } from 'tsdav'
import type { Booking } from '@/types'
import { assertPublicUrl } from './net'
import { buildIcs, parseIcs } from './ical'
import { bookingUid, type CalendarProviderClient } from './types'

export interface CaldavConfig {
  url: string
  username: string
  password: string
  calendar_url?: string
}

async function connect(config: CaldavConfig) {
  await assertPublicUrl(config.url)
  const client = await createDAVClient({
    serverUrl: config.url,
    credentials: { username: config.username, password: config.password },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  })
  const calendars = await client.fetchCalendars()
  const usable = calendars.filter((c) => !c.components || c.components.includes('VEVENT'))
  const calendar: DAVCalendar | undefined = (config.calendar_url && usable.find((c) => c.url === config.calendar_url)) || usable[0]
  if (!calendar) throw new Error('No calendar found on this CalDAV account')
  return { client, calendar }
}

/** Ověří přihlášení a vrátí adresu kalendáře, do kterého se bude zapisovat. */
export async function verifyCaldav(config: CaldavConfig): Promise<{ calendar_url: string; display: string }> {
  const { calendar } = await connect(config)
  return { calendar_url: calendar.url, display: typeof calendar.displayName === 'string' ? calendar.displayName : '' }
}

export function caldavClient(config: CaldavConfig): CalendarProviderClient {
  return {
    canWrite: true,

    async fetchEvents(from, to) {
      const { client, calendar } = await connect(config)
      const objects = await client.fetchCalendarObjects({ calendar, timeRange: { start: from.toISOString(), end: to.toISOString() } })
      return objects.flatMap((o) => (typeof o.data === 'string' ? parseIcs(o.data, from, to, o.url) : []))
    },

    async upsertEvent(booking: Booking, label, existingId) {
      const { client, calendar } = await connect(config)
      const iCalString = buildIcs({
        uid: bookingUid(booking.id),
        summary: label,
        description: [booking.caller_phone && `Tel: ${booking.caller_phone}`, booking.notes].filter(Boolean).join('\n') || undefined,
        start: new Date(booking.starts_at),
        end: new Date(booking.ends_at),
        status: booking.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE',
      })
      if (existingId) {
        const res = await client.updateCalendarObject({ calendarObject: { url: existingId, data: iCalString, etag: '' } })
        if (res.ok) return existingId
      }
      const filename = `${bookingUid(booking.id).replace('@receptio.dev', '')}.ics`
      const res = await client.createCalendarObject({ calendar, iCalString, filename })
      if (!res.ok) throw new Error(`CalDAV create failed: ${res.status}`)
      return new URL(filename, calendar.url.endsWith('/') ? calendar.url : `${calendar.url}/`).toString()
    },

    async deleteEvent(externalId) {
      const { client } = await connect(config)
      await client.deleteCalendarObject({ calendarObject: { url: externalId, data: '', etag: '' } })
    },
  }
}
