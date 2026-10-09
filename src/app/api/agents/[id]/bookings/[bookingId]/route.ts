import { after, NextResponse } from 'next/server'
import { requireAgentAccess } from '@/lib/agents/route-helpers'
import { customerKindForChange } from '@/lib/bookings/messages'
import { notifyCustomer } from '@/lib/bookings/notify'
import { bookingPatchSchema } from '@/lib/bookings/schema'
import { BookingError, deleteBooking, getBooking, updateBooking } from '@/lib/bookings/service'
import { pushBookingToCalendars, removeBookingFromCalendars } from '@/lib/calendar/sync'
import { isUuid } from '@/lib/supabase/queries'

type Ctx = { params: Promise<{ id: string; bookingId: string }> }

async function load(params: Ctx['params']) {
  const p = await params
  const ctx = await requireAgentAccess(Promise.resolve({ id: p.id }))
  if ('response' in ctx) return { response: ctx.response }
  if (!isUuid(p.bookingId)) return { response: NextResponse.json({ error: 'Booking not found' }, { status: 404 }) }
  const booking = await getBooking(ctx.workspace.id, p.bookingId)
  if (!booking || booking.agent_id !== ctx.agent.id) return { response: NextResponse.json({ error: 'Booking not found' }, { status: 404 }) }
  return { ctx, booking }
}

// GET – detail rezervace agenta
export async function GET(_request: Request, { params }: Ctx) {
  const r = await load(params)
  if ('response' in r) return r.response
  return NextResponse.json({ booking: r.booking })
}

// PATCH – změna stavu (confirmed / cancelled / no_show) nebo úprava rezervace
export async function PATCH(request: Request, { params }: Ctx) {
  const r = await load(params)
  if ('response' in r) return r.response
  const parsed = bookingPatchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  try {
    const booking = await updateBooking(r.ctx.workspace.id, r.booking.id, parsed.data)
    after(async () => {
      await pushBookingToCalendars(booking).catch((e) => console.error('Calendar push failed', e))
      const kind = customerKindForChange(r.booking, booking)
      if (kind) await notifyCustomer(booking, kind)
    })
    return NextResponse.json({ booking })
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status })
    console.error('Failed to update booking', e)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}

// DELETE – smazání rezervace
export async function DELETE(_request: Request, { params }: Ctx) {
  const r = await load(params)
  if ('response' in r) return r.response
  const removed = await deleteBooking(r.ctx.workspace.id, r.booking.id)
  if (removed) after(() => removeBookingFromCalendars(removed).catch((e) => console.error('Calendar removal failed', e)))
  return NextResponse.json({ ok: true })
}
