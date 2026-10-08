import { after, NextResponse } from 'next/server'
import { requireAgentAccess } from '@/lib/agents/route-helpers'
import { BookingError, createBooking, listBookings } from '@/lib/bookings/service'
import { newBookingSchema } from '@/lib/bookings/schema'
import { pushBookingToCalendars } from '@/lib/calendar/sync'
import type { BookingStatus } from '@/types'

type Ctx = { params: Promise<{ id: string }> }
const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'cancelled']

// GET /api/agents/:id/bookings?date_from=ISO&date_to=ISO&status=&limit=&cursor=
export async function GET(request: Request, { params }: Ctx) {
  const ctx = await requireAgentAccess(params)
  if ('response' in ctx) return ctx.response
  const sp = new URL(request.url).searchParams
  const status = sp.get('status')
  if (status && !STATUSES.includes(status as BookingStatus)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  for (const k of ['date_from', 'date_to'] as const) {
    const v = sp.get(k)
    if (v && Number.isNaN(new Date(v).getTime())) return NextResponse.json({ error: `Invalid ${k}` }, { status: 400 })
  }
  try {
    const result = await listBookings({
      workspaceId: ctx.workspace.id,
      agentId: ctx.agent.id,
      dateFrom: sp.get('date_from') ?? undefined,
      dateTo: sp.get('date_to') ?? undefined,
      status: (status as BookingStatus | null) ?? undefined,
      limit: Number(sp.get('limit')) || undefined,
      cursor: sp.get('cursor'),
    })
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('Failed to list bookings', e)
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 })
  }
}

// POST /api/agents/:id/bookings – ruční rezervace z dashboardu (mimo rozvrh povolena, překryv ne)
export async function POST(request: Request, { params }: Ctx) {
  const ctx = await requireAgentAccess(params)
  if ('response' in ctx) return ctx.response
  const parsed = newBookingSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  try {
    const booking = await createBooking(ctx.agent, { ...parsed.data, status: parsed.data.status ?? 'confirmed' }, { enforceAvailability: false })
    after(() => pushBookingToCalendars(booking).catch((e) => console.error('Calendar push failed', e)))
    return NextResponse.json({ booking }, { status: 201 })
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status })
    console.error('Failed to create booking', e)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
