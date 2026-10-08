import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AvailabilitySlot } from '@/types'
import { dayOfWeek, fromMinutes, hhmm, toMinutes, zonedToUtc } from './time'

export interface FreeSlot {
  starts_at: string // ISO (UTC)
  ends_at: string
  time: string // lokální HH:MM v zóně agenta
  duration_minutes: number
}

type Row = Pick<AvailabilitySlot, 'day_of_week' | 'date' | 'start_time' | 'end_time' | 'slot_duration_minutes' | 'is_available'>

const SLOT_COLUMNS = 'id, agent_id, workspace_id, day_of_week, date, start_time, end_time, slot_duration_minutes, is_available, note, external_source'

export async function getAvailabilityRows(agentId: string): Promise<AvailabilitySlot[]> {
  const { data, error } = await createAdminClient().from('availability_slots').select(SLOT_COLUMNS).eq('agent_id', agentId)
  if (error) throw error
  return (data as AvailabilitySlot[]).map((r) => ({ ...r, start_time: hhmm(r.start_time), end_time: hhmm(r.end_time) }))
}

/**
 * Volné sloty pro jeden den (čistá funkce):
 *  - okna dne: jednorázová okna na dané datum nahrazují opakující se okna dne v týdnu,
 *  - sloty se generují po slot_duration_minutes a musí se vejít do okna,
 *  - odečtou se blokované časy (is_available = false) a aktivní rezervace (čekající i potvrzené),
 *  - minulé sloty se vynechají.
 */
export function computeFreeSlots(opts: {
  date: string
  tz: string
  rows: Row[]
  bookings: { starts_at: string; ends_at: string }[]
  now?: Date
}): FreeSlot[] {
  const { date, tz, rows, bookings } = opts
  const now = opts.now ?? new Date()
  const dow = dayOfWeek(date)

  const dated = rows.filter((r) => r.date === date && r.is_available)
  const windows = dated.length > 0 ? dated : rows.filter((r) => r.date === null && r.day_of_week === dow && r.is_available)
  const blocks = rows
    .filter((r) => !r.is_available && (r.date === date || (r.date === null && r.day_of_week === dow)))
    .map((r) => [toMinutes(hhmm(r.start_time)), toMinutes(hhmm(r.end_time))] as const)
  const busy = bookings.map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()] as const)

  const seen = new Set<number>()
  const out: FreeSlot[] = []
  for (const w of windows) {
    const start = toMinutes(hhmm(w.start_time))
    const end = toMinutes(hhmm(w.end_time))
    const step = w.slot_duration_minutes
    for (let m = start; m + step <= end; m += step) {
      if (seen.has(m)) continue
      if (blocks.some(([bs, be]) => m < be && m + step > bs)) continue
      const s = zonedToUtc(date, fromMinutes(m), tz)
      const e = new Date(s.getTime() + step * 60_000)
      if (s <= now) continue
      if (busy.some(([bs, be]) => s.getTime() < be && e.getTime() > bs)) continue
      seen.add(m)
      out.push({ starts_at: s.toISOString(), ends_at: e.toISOString(), time: fromMinutes(m), duration_minutes: step })
    }
  }
  return out.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

/** Volné sloty agenta pro den (v jeho časové zóně). */
export async function getFreeSlots(agent: { id: string; workspace_id?: string; timezone: string | null }, date: string): Promise<FreeSlot[]> {
  const tz = agent.timezone ?? 'Europe/Prague'
  const dayStart = zonedToUtc(date, '00:00', tz)
  const dayEnd = new Date(dayStart.getTime() + 26 * 3600_000) // s rezervou na dny s přechodem času; zbytek odfiltruje překryv slotů
  const [rows, bookings, external] = await Promise.all([
    getAvailabilityRows(agent.id),
    createAdminClient()
      .from('bookings')
      .select('starts_at, ends_at')
      .eq('agent_id', agent.id)
      .neq('status', 'cancelled')
      .lt('starts_at', dayEnd.toISOString())
      .gt('ends_at', dayStart.toISOString()),
    // Události z napojených kalendářů (obsazeno); bez tabulky (neprovedená migrace 032) se přeskočí.
    agent.workspace_id
      ? createAdminClient()
          .from('external_events')
          .select('starts_at, ends_at')
          .eq('workspace_id', agent.workspace_id)
          .eq('transparent', false)
          .lt('starts_at', dayEnd.toISOString())
          .gt('ends_at', dayStart.toISOString())
      : Promise.resolve({ data: [] as { starts_at: string; ends_at: string }[], error: null }),
  ])
  if (bookings.error) throw bookings.error
  if (external.error && external.error.code !== '42P01') throw external.error
  return computeFreeSlots({ date, tz, rows, bookings: [...bookings.data, ...(external.data ?? [])] })
}
