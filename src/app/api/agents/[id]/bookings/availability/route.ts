import { NextResponse } from 'next/server'
import { requireAgentAccess } from '@/lib/agents/route-helpers'
import { getFreeSlots } from '@/lib/bookings/availability'
import { isDate } from '@/lib/bookings/time'

// GET /api/agents/:id/bookings/availability?date=YYYY-MM-DD&party_size=2
// Odpověď: { slots: [{ time: "14:00", available: true, starts_at, ends_at, remaining?, resources?: [{ id, name }] }] }
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAgentAccess(params)
  if ('response' in ctx) return ctx.response
  const sp = new URL(request.url).searchParams
  const date = sp.get('date')
  if (!isDate(date)) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  const partySize = Math.max(1, Math.min(1000, Math.round(Number(sp.get('party_size')) || 1)))
  try {
    const slots = await getFreeSlots(ctx.agent, date, partySize)
    return NextResponse.json({
      date,
      timezone: ctx.agent.timezone,
      mode: ctx.agent.booking_mode ?? 'capacity',
      slots: slots.map((s) => ({ ...s, available: true })),
    })
  } catch (e) {
    console.error('Failed to compute availability', e)
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 })
  }
}
