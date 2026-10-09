import 'server-only'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Agent } from '@/types'
import { getFreeSlots } from './availability'
import { isValidPhone } from './phone'
import { BookingError, createBooking } from './service'
import { isDate, localDate, zonedToUtc } from './time'
import { pushBookingToCalendars } from '@/lib/calendar/sync'
import { notifyCustomer, notifyOwnerNewBooking } from './notify'
import { after } from 'next/server'

type Json = Record<string, unknown>
interface ToolCall {
  id: string
  name: string
  args: Json
}

/** Vapi posílá nástroje v `toolCallList` (a pro kompatibilitu i v `toolWithToolCallList`), argumenty jako objekt nebo JSON řetězec. */
function parseToolCalls(message: Json): ToolCall[] {
  const raw = (message.toolCallList ?? (message.toolWithToolCallList as Json[] | undefined)?.map((t) => t.toolCall) ?? []) as Json[]
  return raw.flatMap((c) => {
    const fn = (c.function ?? {}) as Json
    const name = (c.name ?? fn.name) as string | undefined
    const id = c.id as string | undefined
    if (!id || !name) return []
    let args = (c.arguments ?? c.parameters ?? fn.arguments ?? {}) as unknown
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args)
      } catch {
        args = {}
      }
    }
    return [{ id, name, args: (args && typeof args === 'object' ? args : {}) as Json }]
  })
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** ISO bez časové zóny ("2026-10-09T09:00") se bere jako místní čas agenta. */
function parseStart(value: string, tz: string): Date | null {
  if (!value) return null
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const m = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/)
  return m && isDate(m[1]) ? zonedToUtc(m[1], m[2], tz) : null
}

async function checkAvailability(agent: Agent, args: Json): Promise<string> {
  const tz = agent.timezone ?? 'Europe/Prague'
  const date = str(args.date, 10)
  if (!isDate(date)) return 'Invalid date. Use the YYYY-MM-DD format.'
  if (date < localDate(new Date(), tz)) return 'That date is in the past. Ask the caller for a future date.'
  const maxDate = new Date(Date.now() + (agent.booking_advance_days ?? 30) * 86_400_000)
  if (new Date(`${date}T12:00:00Z`) > maxDate) return `Bookings are only possible up to ${agent.booking_advance_days ?? 30} days ahead. Ask for an earlier date.`
  const partySize = Math.max(1, Math.min(1000, Math.round(Number(args.party_size) || 1)))
  const slots = await getFreeSlots(agent, date, partySize)
  if (slots.length === 0) return `No free times on ${date}${partySize > 1 ? ` for ${partySize} people` : ''}. Offer another day.`
  // Ať model nečte desítky časů: rovnoměrně vybereme nejvýše 8, plný seznam je ve strukturovaných datech.
  const step = Math.ceil(slots.length / 8)
  const picked = slots.filter((_, i) => i % step === 0)
  // Zdrojový režim: u každého času i volné zdroje (model je nabídne, zákazník si vybere, resource_id se předá do createBooking).
  const describe = (s: (typeof slots)[number]) =>
    `${s.time} (starts_at ${s.starts_at}${s.resources ? `; free: ${s.resources.map((r) => `${r.name} [resource_id ${r.id}, seats ${r.capacity}]`).join(', ')}` : ''})`
  return `Free times on ${date} (${tz})${partySize > 1 ? ` for ${partySize} people` : ''}: ${picked.map(describe).join('; ')}. Each slot lasts ${slots[0].duration_minutes} minutes.`
}

async function bookingTool(agent: Agent, args: Json, vapiCallId: string | undefined, customerNumber: string | undefined): Promise<string> {
  const tz = agent.timezone ?? 'Europe/Prague'
  const name = str(args.caller_name, 120) || str(args.customer_name, 120)
  const title = str(args.title, 200) || 'Booking'
  const start = parseStart(str(args.starts_at, 40), tz)
  if (!name) return 'Missing caller_name. Ask for the caller\'s name.'
  if (!start) return 'Invalid starts_at. Use ISO 8601, exactly as returned by checkAvailability.'
  const given = str(args.caller_phone, 40) || str(args.customer_phone, 40)
  const partySize = Math.max(1, Math.min(1000, Math.round(Number(args.party_size) || 1)))
  const resourceId = str(args.resource_id, 40)
  const notes = str(args.notes, 2000)
  if (given && !isValidPhone(given)) return 'The phone number is not valid (digits only). Ask the caller to repeat it digit by digit, or use the number they are calling from.'
  const phone = given || customerNumber || null

  let callLogId: string | null = null
  if (vapiCallId) {
    const { data } = await createAdminClient().from('call_logs').select('id').eq('vapi_call_id', vapiCallId).maybeSingle()
    callLogId = data?.id ?? null
  }
  try {
    const booking = await createBooking(agent, { caller_name: name, caller_phone: phone, starts_at: start.toISOString(), title, notes: notes || null, party_size: partySize, resource_id: /^[0-9a-f-]{36}$/i.test(resourceId) ? resourceId : null, source: 'phone', vapi_call_id: vapiCallId ?? null, call_log_id: callLogId }, { enforceAvailability: true })
    after(async () => {
      await Promise.allSettled([
        pushBookingToCalendars(booking),
        notifyOwnerNewBooking(booking),
        booking.status === 'confirmed' ? notifyCustomer(booking, 'confirmed') : Promise.resolve(false),
      ])
    })
    return booking.status === 'confirmed'
      ? `Booking confirmed for ${name} on ${booking.starts_at}.`
      : `Booking recorded for ${name} on ${booking.starts_at}. It is awaiting confirmation by the business; do not tell the caller it is confirmed.`
  } catch (e) {
    if (e instanceof BookingError && (e.code === 'unavailable' || e.code === 'conflict')) {
      return 'That time is no longer available. Apologise, call checkAvailability again and offer other free times.'
    }
    console.error('Vapi tool createBooking failed', e)
    return 'The booking could not be saved. Apologise and offer to take a message instead.'
  }
}

/** Vapi `tool-calls`: vykoná checkAvailability / createBooking a vrátí `{ results: [{ toolCallId, result }] }`. */
export async function handleToolCalls(message: Json, agentId: string, vapiCallId: string | undefined, customerNumber: string | undefined) {
  const { data: agent, error } = await createAdminClient().from('agents').select('*').eq('id', agentId).maybeSingle()
  if (error || !agent) {
    console.error('Vapi tool-calls: agent lookup failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  const results = await Promise.all(
    parseToolCalls(message).map(async (call) => {
      let result: string
      try {
        if (!(agent as Agent).booking_enabled) result = 'Booking is not enabled for this business. Offer to take a message instead.'
        else if (call.name === 'checkAvailability') result = await checkAvailability(agent as Agent, call.args)
        else if (call.name === 'createBooking') result = await bookingTool(agent as Agent, call.args, vapiCallId, customerNumber)
        else result = `Unknown tool ${call.name}.`
      } catch (e) {
        console.error('Vapi tool failed', call.name, e)
        result = 'The tool failed. Apologise and offer to take a message instead.'
      }
      return { toolCallId: call.id, result }
    })
  )
  return NextResponse.json({ results })
}
