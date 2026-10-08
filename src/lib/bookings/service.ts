import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Agent, Booking, BookingStatus } from '@/types'
import { getFreeSlots } from './availability'
import { isValidPhone, normalizePhoneValue } from './phone'
import { localDate } from './time'

export class BookingError extends Error {
  constructor(
    message: string,
    public code: 'invalid' | 'unavailable' | 'conflict' | 'not_found' | 'failed',
    public status = 400
  ) {
    super(message)
  }
}

const COLUMNS =
  'id, agent_id, workspace_id, external_id, calendar_connection_id, caller_name, caller_phone, starts_at, ends_at, title, notes, status, confirmed_at, cancelled_at, call_log_id, created_at'

export const BOOKING_COLUMNS = COLUMNS
const DEFAULT_DURATION_MIN = 30

export interface NewBooking {
  caller_name: string
  caller_phone?: string | null
  starts_at: string
  ends_at?: string | null
  title: string
  notes?: string | null
  status?: BookingStatus
  call_log_id?: string | null
}

/**
 * Vytvoří rezervaci. Hovor od AI (`enforceAvailability`) musí trefit volný slot; ručně zadaná rezervace
 * z dashboardu smí mimo rozvrh, ale nikdy se nesmí překrývat s jinou aktivní rezervací agenta.
 */
export async function createBooking(
  agent: Pick<Agent, 'id' | 'workspace_id' | 'timezone' | 'booking_auto_confirm'>,
  input: NewBooking,
  opts: { enforceAvailability: boolean }
): Promise<Booking> {
  if (input.caller_phone && !isValidPhone(input.caller_phone)) throw new BookingError('Invalid phone number', 'invalid')
  const start = new Date(input.starts_at)
  if (Number.isNaN(start.getTime())) throw new BookingError('Invalid start time', 'invalid')
  let end = input.ends_at ? new Date(input.ends_at) : null
  if (end && Number.isNaN(end.getTime())) throw new BookingError('Invalid end time', 'invalid')

  if (opts.enforceAvailability) {
    const tz = agent.timezone ?? 'Europe/Prague'
    const slots = await getFreeSlots(agent, localDate(start, tz))
    const slot = slots.find((s) => new Date(s.starts_at).getTime() === start.getTime())
    if (!slot) throw new BookingError('That time is not available', 'unavailable', 409)
    end = new Date(slot.ends_at)
  }
  if (!end) end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60_000)
  if (end <= start) throw new BookingError('End must be after start', 'invalid')

  const status: BookingStatus = input.status ?? (opts.enforceAvailability && !agent.booking_auto_confirm ? 'pending' : 'confirmed')
  const { data, error } = await createAdminClient()
    .from('bookings')
    .insert({
      agent_id: agent.id,
      workspace_id: agent.workspace_id,
      caller_name: input.caller_name,
      caller_phone: input.caller_phone ? normalizePhoneValue(input.caller_phone) : null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      title: input.title,
      notes: input.notes ?? null,
      status,
      confirmed_at: status === 'confirmed' ? new Date().toISOString() : null,
      call_log_id: input.call_log_id ?? null,
    })
    .select(COLUMNS)
    .single()
  if (error) {
    if (error.code === '23P01') throw new BookingError('That time is already booked', 'conflict', 409)
    console.error('Booking insert failed', error)
    throw new BookingError('Failed to create booking', 'failed', 500)
  }
  return data as Booking
}

export interface BookingPatch {
  status?: BookingStatus
  starts_at?: string
  ends_at?: string
  title?: string
  notes?: string | null
  caller_name?: string
  caller_phone?: string | null
  agent_id?: string
}

export async function getBooking(workspaceId: string, id: string): Promise<Booking | null> {
  const { data, error } = await createAdminClient().from('bookings').select(COLUMNS).eq('id', id).eq('workspace_id', workspaceId).maybeSingle()
  if (error) throw error
  return data as Booking | null
}

/** Rezervace podle ID bez kontroly workspace – jen pro podepsané odkazy z e-mailu / SMS (token ověřuje volající). */
export async function getBookingById(id: string): Promise<Booking | null> {
  const { data, error } = await createAdminClient().from('bookings').select(COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  return data as Booking | null
}

export async function updateBooking(workspaceId: string, id: string, patch: BookingPatch): Promise<Booking> {
  const current = await getBooking(workspaceId, id)
  if (!current) throw new BookingError('Booking not found', 'not_found', 404)

  if (patch.caller_phone && !isValidPhone(patch.caller_phone)) throw new BookingError('Invalid phone number', 'invalid')
  const update: Record<string, unknown> = {}
  for (const k of ['title', 'notes', 'caller_name'] as const) if (patch[k] !== undefined) update[k] = patch[k]
  if (patch.caller_phone !== undefined) update.caller_phone = patch.caller_phone ? normalizePhoneValue(patch.caller_phone) : null

  if (patch.agent_id !== undefined && patch.agent_id !== current.agent_id) {
    const { data: agent, error: agentError } = await createAdminClient().from('agents').select('id').eq('id', patch.agent_id).eq('workspace_id', workspaceId).maybeSingle()
    if (agentError) throw new BookingError('Failed to update booking', 'failed', 500)
    if (!agent) throw new BookingError('Agent not found', 'invalid')
    update.agent_id = patch.agent_id
  }

  if (patch.starts_at !== undefined || patch.ends_at !== undefined) {
    const start = new Date(patch.starts_at ?? current.starts_at)
    const end = patch.ends_at
      ? new Date(patch.ends_at)
      : patch.starts_at
        ? new Date(start.getTime() + (new Date(current.ends_at).getTime() - new Date(current.starts_at).getTime())) // délka se zachová
        : new Date(current.ends_at)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new BookingError('Invalid time range', 'invalid')
    update.starts_at = start.toISOString()
    update.ends_at = end.toISOString()
  }
  if (patch.status !== undefined && patch.status !== current.status) {
    update.status = patch.status
    update.confirmed_at = patch.status === 'confirmed' ? new Date().toISOString() : current.confirmed_at
    update.cancelled_at = patch.status === 'cancelled' ? new Date().toISOString() : null
  }
  if (Object.keys(update).length === 0) return current

  const { data, error } = await createAdminClient().from('bookings').update(update).eq('id', id).eq('workspace_id', workspaceId).select(COLUMNS).single()
  if (error) {
    if (error.code === '23P01') throw new BookingError('That time is already booked', 'conflict', 409)
    console.error('Booking update failed', error)
    throw new BookingError('Failed to update booking', 'failed', 500)
  }
  return data as Booking
}

export async function deleteBooking(workspaceId: string, id: string): Promise<Booking | null> {
  const current = await getBooking(workspaceId, id)
  if (!current) return null
  const { error } = await createAdminClient().from('bookings').delete().eq('id', id).eq('workspace_id', workspaceId)
  if (error) throw new BookingError('Failed to delete booking', 'failed', 500)
  return current
}

export interface ListFilters {
  workspaceId: string
  agentId?: string
  dateFrom?: string // ISO
  dateTo?: string // ISO
  status?: BookingStatus
  limit?: number
  cursor?: string | null
}

const encodeCursor = (b: Pick<Booking, 'starts_at' | 'id'>) => Buffer.from(`${new Date(b.starts_at).toISOString()}|${b.id}`).toString('base64url')
function decodeCursor(c: string): { startsAt: string; id: string } | null {
  try {
    const [startsAt, id] = Buffer.from(c, 'base64url').toString().split('|')
    return startsAt && id && !Number.isNaN(new Date(startsAt).getTime()) && /^[0-9a-f-]{36}$/i.test(id) ? { startsAt, id } : null
  } catch {
    return null
  }
}

/** Seznam rezervací řazený podle začátku; stránkování kurzorem (starts_at + id). */
export async function listBookings(f: ListFilters): Promise<{ bookings: Booking[]; nextCursor: string | null }> {
  const limit = Math.min(500, Math.max(1, f.limit ?? 100))
  let q = createAdminClient().from('bookings').select(COLUMNS).eq('workspace_id', f.workspaceId)
  if (f.agentId) q = q.eq('agent_id', f.agentId)
  if (f.status) q = q.eq('status', f.status)
  if (f.dateFrom) q = q.gte('ends_at', f.dateFrom)
  if (f.dateTo) q = q.lt('starts_at', f.dateTo)
  if (f.cursor) {
    const c = decodeCursor(f.cursor)
    if (!c) throw new BookingError('Invalid cursor', 'invalid')
    q = q.or(`starts_at.gt.${c.startsAt},and(starts_at.eq.${c.startsAt},id.gt.${c.id})`)
  }
  const { data, error } = await q.order('starts_at', { ascending: true }).order('id', { ascending: true }).limit(limit + 1)
  if (error) throw error
  const rows = data as Booking[]
  const page = rows.slice(0, limit)
  return { bookings: page, nextCursor: rows.length > limit ? encodeCursor(page[page.length - 1]) : null }
}
