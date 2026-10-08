import type { Booking } from '@/types'

/** Událost načtená z externího kalendáře. */
export interface ExternalEvent {
  id: string // ID události / URL objektu v kalendáři
  bookingId: string | null // vyplněno u událostí, které jsme do kalendáře poslali my
  start: Date
  end: Date
  allDay: boolean
  cancelled: boolean
  transparent: boolean // "volno" – nebrání rezervaci
  title: string | null // null u soukromých událostí
}

export interface CalendarProviderClient {
  /** Provider umí zapisovat (Google, CalDAV); iCal feed je jen ke čtení. */
  canWrite: boolean
  fetchEvents(from: Date, to: Date): Promise<ExternalEvent[]>
  upsertEvent?(booking: Booking, label: string, existingId: string | null): Promise<string>
  deleteEvent?(externalId: string): Promise<void>
  /** Změněná konfigurace (např. obnovený token), kterou je třeba uložit. */
  updatedConfig?(): unknown | null
}

export const bookingUid = (id: string) => `receptio-${id}@receptio.dev`
export const bookingIdFromUid = (uid: string | undefined | null) => uid?.match(/^receptio-([0-9a-f-]{36})@receptio\.dev$/i)?.[1] ?? null
