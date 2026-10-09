import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Agent, AvailabilitySlot, BookingMode, BookingResource } from '@/types'
import { addDays, dayOfWeek, fromMinutes, hhmm, isMissingTable, localDate, toMinutes, zonedToUtc } from './time'

export interface SlotResource {
  id: string
  name: string
  capacity: number
}

export interface FreeSlot {
  starts_at: string // ISO (UTC)
  ends_at: string
  time: string // lokální HH:MM v zóně agenta
  duration_minutes: number
  remaining?: number // kapacitní režim: kolik míst ještě zbývá
  resources?: SlotResource[] // zdrojový režim: volné zdroje v tomto čase
}

export interface FreeInterval {
  start: number // minuty od půlnoci (místní čas)
  end: number
}

type Row = Pick<AvailabilitySlot, 'day_of_week' | 'date' | 'start_time' | 'end_time' | 'slot_duration_minutes' | 'is_available'>

/** Existující rezervace pro výpočet obsazenosti (u starších dat bez party_size / resource_id platí 1 osoba bez zdroje). */
export interface BusyBooking {
  starts_at: string
  ends_at: string
  party_size?: number | null
  resource_id?: string | null
}

export interface Capacity {
  mode: BookingMode
  capacity: number // kapacitní režim: míst na jeden čas
  resources: SlotResource[] // zdrojový režim: aktivní zdroje
}

const DEFAULT_CAPACITY: Capacity = { mode: 'capacity', capacity: 1, resources: [] }
const INACTIVE = '(cancelled,no_show)'
const SNAP = 15

const SLOT_COLUMNS = 'id, agent_id, workspace_id, day_of_week, date, start_time, end_time, slot_duration_minutes, is_available, note, external_source'

export async function getAvailabilityRows(agentId: string): Promise<AvailabilitySlot[]> {
  const { data, error } = await createAdminClient().from('availability_slots').select(SLOT_COLUMNS).eq('agent_id', agentId)
  if (error) throw error
  return (data as AvailabilitySlot[]).map((r) => ({ ...r, start_time: hhmm(r.start_time), end_time: hhmm(r.end_time) }))
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && aEnd > bStart
const asRange = (b: BusyBooking) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()] as const

/** Obsazenost jednoho časového úseku podle režimu: zbývající místa (kapacitní) nebo volné zdroje (zdrojový). */
function occupancy(cap: Capacity, bookings: BusyBooking[], start: number, end: number, partySize: number) {
  const hits = bookings.filter((b) => {
    const [bs, be] = asRange(b)
    return overlaps(start, end, bs, be)
  })
  if (cap.mode === 'resource') {
    const taken = new Set(hits.map((b) => b.resource_id).filter(Boolean))
    const free = cap.resources.filter((r) => r.capacity >= partySize && !taken.has(r.id))
    return { free: free.length > 0, remaining: undefined as number | undefined, resources: free }
  }
  const used = hits.reduce((s, b) => s + (b.party_size ?? 1), 0)
  const remaining = cap.capacity - used
  return { free: remaining >= partySize, remaining, resources: undefined }
}

/**
 * Volné sloty pro jeden den (čistá funkce):
 *  - okna dne: jednorázová okna na dané datum nahrazují opakující se okna dne v týdnu,
 *  - sloty se generují po slot_duration_minutes a musí se vejít do okna,
 *  - odečtou se blokované časy (is_available = false) a události z jiných kalendářů (`blockers`),
 *  - rezervace se posuzují podle režimu: kapacitní (součet osob < kapacita) nebo zdrojový (existuje volný zdroj),
 *  - minulé sloty a dny za horizontem `advanceDays` se vynechají.
 */
export function computeFreeSlots(opts: {
  date: string
  tz: string
  rows: Row[]
  bookings: BusyBooking[]
  blockers?: { starts_at: string; ends_at: string }[]
  capacity?: Capacity
  partySize?: number
  advanceDays?: number
  now?: Date
}): FreeSlot[] {
  const { date, tz, rows, bookings } = opts
  const cap = opts.capacity ?? DEFAULT_CAPACITY
  const partySize = Math.max(1, opts.partySize ?? 1)
  const now = opts.now ?? new Date()
  const dow = dayOfWeek(date)
  if (opts.advanceDays !== undefined && date > addDays(localDate(now, tz), opts.advanceDays)) return []

  const dated = rows.filter((r) => r.date === date && r.is_available)
  const windows = dated.length > 0 ? dated : rows.filter((r) => r.date === null && r.day_of_week === dow && r.is_available)
  const blocks = rows
    .filter((r) => !r.is_available && (r.date === date || (r.date === null && r.day_of_week === dow)))
    .map((r) => [toMinutes(hhmm(r.start_time)), toMinutes(hhmm(r.end_time))] as const)
  const external = (opts.blockers ?? []).map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()] as const)

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
      if (external.some(([bs, be]) => s.getTime() < be && e.getTime() > bs)) continue
      const occ = occupancy(cap, bookings, s.getTime(), e.getTime(), partySize)
      if (!occ.free) continue
      seen.add(m)
      out.push({ starts_at: s.toISOString(), ends_at: e.toISOString(), time: fromMinutes(m), duration_minutes: step, remaining: occ.remaining, resources: occ.resources })
    }
  }
  return out.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

/** Kapacita agenta (režim, počet míst, aktivní zdroje). Bez migrace 034 platí výchozí kapacitní režim s jedním místem. */
export async function loadCapacity(agent: Pick<Agent, 'id' | 'booking_mode' | 'booking_capacity'>): Promise<Capacity> {
  const mode = agent.booking_mode === 'resource' ? 'resource' : 'capacity'
  if (mode === 'capacity') return { mode, capacity: Math.max(1, agent.booking_capacity ?? 1), resources: [] }
  const { data, error } = await createAdminClient().from('booking_resources').select('id, name, capacity').eq('agent_id', agent.id).eq('is_active', true).order('sort_order').order('created_at')
  if (error && !isMissingTable(error.code)) throw error
  return { mode, capacity: 1, resources: (data ?? []) as SlotResource[] }
}

type SlotAgent = Pick<Agent, 'id' | 'workspace_id' | 'timezone' | 'booking_mode' | 'booking_capacity' | 'booking_advance_days'>

/** Volné sloty agenta pro den (v jeho časové zóně) a velikost skupiny. */
export async function getFreeSlots(agent: SlotAgent, date: string, partySize = 1): Promise<FreeSlot[]> {
  const tz = agent.timezone ?? 'Europe/Prague'
  const dayStart = zonedToUtc(date, '00:00', tz)
  const dayEnd = new Date(dayStart.getTime() + 26 * 3600_000) // s rezervou na dny s přechodem času; zbytek odfiltruje překryv slotů
  const supabase = createAdminClient()
  const [rows, bookings, external, capacity] = await Promise.all([
    getAvailabilityRows(agent.id),
    supabase.from('bookings').select('*').eq('agent_id', agent.id).not('status', 'in', INACTIVE).lt('starts_at', dayEnd.toISOString()).gt('ends_at', dayStart.toISOString()),
    // Události z napojených kalendářů (obsazeno); bez tabulky (neprovedená migrace 032) se přeskočí.
    supabase.from('external_events').select('starts_at, ends_at').eq('workspace_id', agent.workspace_id).eq('transparent', false).lt('starts_at', dayEnd.toISOString()).gt('ends_at', dayStart.toISOString()),
    loadCapacity(agent),
  ])
  if (bookings.error) throw bookings.error
  if (external.error && !isMissingTable(external.error.code)) throw external.error
  return computeFreeSlots({ date, tz, rows, bookings: bookings.data, blockers: external.data ?? [], capacity, partySize, advanceDays: agent.booking_advance_days ?? undefined })
}

const mergeIntervals = (list: FreeInterval[]) => {
  const sorted = [...list].sort((a, b) => a.start - b.start)
  const out: FreeInterval[] = []
  for (const i of sorted) {
    const last = out[out.length - 1]
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end)
    else out.push({ ...i })
  }
  return out
}

/**
 * Volné "kapsy" v jednom dni (čistá funkce): po čtvrthodinách je čas volný, pokud leží v okně dostupnosti, není blokovaný
 * ani obsazený událostí z jiného kalendáře, neuplynul a zbývá kapacita (kapacitní režim) nebo aspoň jeden volný zdroj
 * (zdrojový). Vrací souvislé úseky, ne sloty pevné délky; kratší než 15 minut se zahodí.
 */
export function computeFreeIntervals(opts: {
  date: string
  tz: string
  rows: Row[]
  busy?: { starts_at: string; ends_at: string }[] // absolutně obsazeno (např. události z jiných kalendářů)
  bookings?: BusyBooking[]
  capacity?: Capacity
  now?: Date
}): FreeInterval[] {
  const { date, tz, rows } = opts
  const cap = opts.capacity ?? DEFAULT_CAPACITY
  const now = opts.now ?? new Date()
  const dow = dayOfWeek(date)
  const dayStart = zonedToUtc(date, '00:00', tz).getTime()

  const dated = rows.filter((r) => r.date === date && r.is_available)
  const windows = (dated.length > 0 ? dated : rows.filter((r) => r.date === null && r.day_of_week === dow && r.is_available)).map((r) => ({ start: toMinutes(hhmm(r.start_time)), end: toMinutes(hhmm(r.end_time)) }))
  const taken: FreeInterval[] = [
    ...rows.filter((r) => !r.is_available && (r.date === date || (r.date === null && r.day_of_week === dow))).map((r) => ({ start: toMinutes(hhmm(r.start_time)), end: toMinutes(hhmm(r.end_time)) })),
    ...(opts.busy ?? []).map((b) => ({ start: Math.floor((new Date(b.starts_at).getTime() - dayStart) / 60_000), end: Math.ceil((new Date(b.ends_at).getTime() - dayStart) / 60_000) })),
  ]
  const nowMin = Math.ceil((now.getTime() - dayStart) / 60_000)
  if (nowMin > 0) taken.push({ start: 0, end: nowMin })
  const blocked = mergeIntervals(taken)
  const bookings = opts.bookings ?? []

  const cells: number[] = []
  for (const w of mergeIntervals(windows)) {
    for (let c = Math.ceil(w.start / SNAP) * SNAP; c + SNAP <= w.end; c += SNAP) {
      if (blocked.some((b) => overlaps(c, c + SNAP, b.start, b.end))) continue
      const free = occupancy(cap, bookings, dayStart + c * 60_000, dayStart + (c + SNAP) * 60_000, 1).free
      if (free) cells.push(c)
    }
  }
  const out: FreeInterval[] = []
  for (const c of cells) {
    const last = out[out.length - 1]
    if (last && last.end === c) last.end = c + SNAP
    else out.push({ start: c, end: c + SNAP })
  }
  return out
}

/**
 * Volné kapsy dne pro agenty workspace (jeden zvolený, jinak sjednocení všech agentů, kteří přijímají rezervace;
 * když žádný nepřijímá, všech). `configured` = má aspoň jeden agent nastavený rozvrh dostupnosti.
 */
export async function getFreeIntervals(workspaceId: string, date: string, tz: string, agentId?: string): Promise<{ intervals: FreeInterval[]; configured: boolean }> {
  const supabase = createAdminClient()
  let aq = supabase.from('agents').select('*').eq('workspace_id', workspaceId)
  if (agentId) aq = aq.eq('id', agentId)
  const { data: agents, error } = await aq
  if (error) throw error
  const enabled = (agents ?? []).filter((a) => a.booking_enabled)
  const chosen = (agentId ? (agents ?? []) : enabled.length > 0 ? enabled : (agents ?? [])) as Agent[]

  const dayStart = zonedToUtc(date, '00:00', tz)
  const dayEnd = new Date(dayStart.getTime() + 26 * 3600_000)
  const [{ data: external, error: extError }, ...perAgent] = await Promise.all([
    supabase.from('external_events').select('starts_at, ends_at').eq('workspace_id', workspaceId).eq('transparent', false).lt('starts_at', dayEnd.toISOString()).gt('ends_at', dayStart.toISOString()),
    ...chosen.map(async (a) => {
      const [rows, bookings, capacity] = await Promise.all([
        getAvailabilityRows(a.id),
        supabase.from('bookings').select('*').eq('agent_id', a.id).not('status', 'in', INACTIVE).lt('starts_at', dayEnd.toISOString()).gt('ends_at', dayStart.toISOString()),
        loadCapacity(a),
      ])
      if (bookings.error) throw bookings.error
      return { rows, bookings: bookings.data as BusyBooking[], capacity }
    }),
  ])
  if (extError && !isMissingTable(extError.code)) throw extError

  const all: FreeInterval[] = []
  let configured = false
  for (const a of perAgent) {
    if (a.rows.some((r) => r.is_available)) configured = true
    all.push(...computeFreeIntervals({ date, tz, rows: a.rows, bookings: a.bookings, busy: external ?? [], capacity: a.capacity }))
  }
  return { intervals: mergeIntervals(all), configured }
}

/**
 * Vejde se rezervace do kapacity / na zdroj? Použije se při úpravě existující rezervace (vlastní řádek se nepočítá).
 * Zápis nové rezervace hlídá atomicky databázová funkce create_booking_checked.
 */
export async function fitsCapacity(agent: Pick<Agent, 'id' | 'booking_mode' | 'booking_capacity'>, opts: { start: Date; end: Date; partySize: number; resourceId?: string | null; excludeId?: string }): Promise<boolean> {
  const supabase = createAdminClient()
  let q = supabase.from('bookings').select('*').eq('agent_id', agent.id).not('status', 'in', INACTIVE).lt('starts_at', opts.end.toISOString()).gt('ends_at', opts.start.toISOString())
  if (opts.excludeId) q = q.neq('id', opts.excludeId)
  const [{ data, error }, cap] = await Promise.all([q, loadCapacity(agent)])
  if (error) throw error
  if (cap.mode === 'resource') {
    if (!opts.resourceId) return true // bez zdroje se kapacita neposuzuje
    const r = cap.resources.find((x) => x.id === opts.resourceId)
    if (!r || r.capacity < opts.partySize) return false
    return !(data as BusyBooking[]).some((b) => b.resource_id === opts.resourceId)
  }
  const used = (data as BusyBooking[]).reduce((sum, b) => sum + (b.party_size ?? 1), 0)
  return used + opts.partySize <= cap.capacity
}

export type { BookingResource }
