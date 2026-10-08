import { after, NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { BookingError, deleteBooking, updateBooking } from '@/lib/bookings/service'
import { bookingPatchSchema } from '@/lib/bookings/schema'
import { isUuid } from '@/lib/supabase/queries'
import { pushBookingToCalendars, removeBookingFromCalendars } from '@/lib/calendar/sync'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/bookings/:id – potvrzení / zrušení, změna času a údajů
export async function PATCH(request: Request, { params }: Ctx) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  const parsed = bookingPatchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  try {
    const booking = await updateBooking(ctx.workspace.id, id, parsed.data)
    after(() => pushBookingToCalendars(booking).catch((e) => console.error('Calendar push failed', e)))
    return NextResponse.json({ booking })
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status })
    console.error('Failed to update booking', e)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}

// DELETE /api/bookings/:id
export async function DELETE(_request: Request, { params }: Ctx) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  try {
    const removed = await deleteBooking(ctx.workspace.id, id)
    if (!removed) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    after(() => removeBookingFromCalendars(removed).catch((e) => console.error('Calendar removal failed', e)))
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Failed to delete booking', e)
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 })
  }
}
