import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { splitByLocalDay } from '@/lib/bookings/time'
import { BOOKING_COLUMNS } from '@/lib/bookings/service'
import type { Booking } from '@/types'
import { clientFor, getConnection, type ConnectionRow } from './connections'

const WINDOW_PAST_DAYS = 1
const WINDOW_FUTURE_DAYS = 60
const MAX_BLOCK_ROWS = 2000
const DAY = 86_400_000

const label = (b: Booking) => `${b.title} – ${b.caller_name}`

/** Napojení, do kterého se rezervace zapisují: první zapnuté s oprávněním k zápisu (Google, CalDAV). */
async function writableConnection(workspaceId: string, preferredId?: string | null): Promise<ConnectionRow | null> {
  const { data, error } = await createAdminClient()
    .from('calendar_connections')
    .select('id, workspace_id, provider, name, sync_enabled, last_synced_at, last_sync_error, created_at, config')
    .eq('workspace_id', workspaceId)
    .eq('sync_enabled', true)
    .in('provider', ['google', 'caldav'])
    .order('created_at')
  if (error) throw error
  const rows = data as ConnectionRow[]
  return rows.find((r) => r.id === preferredId) ?? rows[0] ?? null
}

/** Odešle novou / změněnou rezervaci do externího kalendáře (best effort; chyba nikdy neshodí akci uživatele). */
export async function pushBookingToCalendars(booking: Booking): Promise<void> {
  if (booking.external_id?.startsWith('demo:')) return // demo data se do skutečných kalendářů neposílají
  const conn = await writableConnection(booking.workspace_id, booking.calendar_connection_id)
  if (!conn) return
  const { client, persist } = clientFor(conn)
  const supabase = createAdminClient()
  try {
    if (booking.status === 'cancelled') {
      if (booking.external_id) {
        await client.deleteEvent?.(booking.external_id)
        await supabase.from('bookings').update({ external_id: null }).eq('id', booking.id)
      }
      return
    }
    const externalId = await client.upsertEvent!(booking, label(booking), booking.external_id)
    if (externalId !== booking.external_id || booking.calendar_connection_id !== conn.id) {
      await supabase.from('bookings').update({ external_id: externalId, calendar_connection_id: conn.id }).eq('id', booking.id)
    }
  } finally {
    await persist()
  }
}

/** Smaže událost smazané rezervace z externího kalendáře. */
export async function removeBookingFromCalendars(booking: Booking): Promise<void> {
  if (booking.external_id?.startsWith('demo:')) return
  if (!booking.external_id || !booking.calendar_connection_id) return
  const conn = await getConnection(booking.workspace_id, booking.calendar_connection_id)
  if (!conn) return
  const { client, persist } = clientFor(conn)
  try {
    await client.deleteEvent?.(booking.external_id)
  } finally {
    await persist()
  }
}

export interface SyncResult {
  ok: boolean
  imported: number // zablokované časy z kalendáře
  pushed: number
  updated: number
  error?: string
}

/**
 * Synchronizace jednoho napojení:
 *  1. přečte události v okně (včera až +60 dní),
 *  2. události, které jsme poslali my, promítne zpět do rezervací (zrušení, změna času),
 *  3. cizí události uloží jako blokované časy všech agentů workspace (is_available = false),
 *  4. u kalendářů se zápisem odešle rezervace, které tam ještě nejsou.
 */
export async function syncConnection(conn: ConnectionRow): Promise<SyncResult> {
  const supabase = createAdminClient()
  const result: SyncResult = { ok: true, imported: 0, pushed: 0, updated: 0 }
  const { client, persist } = clientFor(conn)
  try {
    const now = Date.now()
    const from = new Date(now - WINDOW_PAST_DAYS * DAY)
    const to = new Date(now + WINDOW_FUTURE_DAYS * DAY)
    const events = await client.fetchEvents(from, to)

    // 2) naše události -> rezervace
    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select(BOOKING_COLUMNS)
      .eq('workspace_id', conn.workspace_id)
      .gte('ends_at', from.toISOString())
      .lt('starts_at', to.toISOString())
    if (bErr) throw bErr
    const ours = new Map((bookings as Booking[]).map((b) => [b.id, b]))
    const byExternal = new Map((bookings as Booking[]).filter((b) => b.external_id).map((b) => [b.external_id!, b]))
    const ownedExternalIds = new Set<string>()

    if (client.canWrite) {
      for (const e of events) {
        const b = (e.bookingId && ours.get(e.bookingId)) || byExternal.get(e.id)
        if (!b) continue
        ownedExternalIds.add(e.id)
        if (e.cancelled && b.status !== 'cancelled') {
          await supabase.from('bookings').update({ status: 'cancelled', cancelled_at: new Date().toISOString(), external_id: null }).eq('id', b.id)
          result.updated++
        } else if (!e.cancelled && (e.start.getTime() !== new Date(b.starts_at).getTime() || e.end.getTime() !== new Date(b.ends_at).getTime())) {
          const { error } = await supabase.from('bookings').update({ starts_at: e.start.toISOString(), ends_at: e.end.toISOString() }).eq('id', b.id)
          if (!error) result.updated++ // při kolizi s jinou rezervací se změna z kalendáře přeskočí
        }
      }
    }

    // 3) cizí události -> blokace
    const { data: agents, error: aErr } = await supabase.from('agents').select('id, timezone').eq('workspace_id', conn.workspace_id)
    if (aErr) throw aErr
    const rows: Record<string, unknown>[] = []
    for (const e of events) {
      if (e.cancelled || e.transparent || e.bookingId || ownedExternalIds.has(e.id)) continue
      for (const a of agents) {
        for (const seg of splitByLocalDay(e.start, e.end, a.timezone ?? 'Europe/Prague')) {
          if (rows.length >= MAX_BLOCK_ROWS) break
          rows.push({
            agent_id: a.id,
            workspace_id: conn.workspace_id,
            day_of_week: null,
            date: seg.date,
            start_time: seg.start,
            end_time: seg.end,
            slot_duration_minutes: 30,
            is_available: false,
            note: conn.name,
            external_source: conn.id,
          })
        }
      }
    }
    const del = await supabase.from('availability_slots').delete().eq('external_source', conn.id)
    if (del.error) throw del.error
    for (let i = 0; i < rows.length; i += 500) {
      const ins = await supabase.from('availability_slots').insert(rows.slice(i, i + 500))
      if (ins.error) throw ins.error
    }
    result.imported = rows.length

    // 4) rezervace, které v kalendáři ještě nejsou
    if (client.canWrite) {
      for (const b of bookings as Booking[]) {
        if (b.status === 'cancelled' || b.external_id) continue
        try {
          const externalId = await client.upsertEvent!(b, label(b), null)
          await supabase.from('bookings').update({ external_id: externalId, calendar_connection_id: conn.id }).eq('id', b.id)
          result.pushed++
        } catch (e) {
          console.error('Calendar: failed to push booking', b.id, e)
        }
      }
    }
    await supabase.from('calendar_connections').update({ last_synced_at: new Date().toISOString(), last_sync_error: null }).eq('id', conn.id)
  } catch (e) {
    result.ok = false
    result.error = e instanceof Error ? e.message : 'Sync failed'
    console.error('Calendar sync failed', conn.id, e)
    await supabase.from('calendar_connections').update({ last_sync_error: result.error.slice(0, 300) }).eq('id', conn.id)
  } finally {
    await persist()
  }
  return result
}
