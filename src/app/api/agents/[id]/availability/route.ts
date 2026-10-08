import { NextResponse } from 'next/server'
import { requireAgentAccess } from '@/lib/agents/route-helpers'
import { getFreeSlots } from '@/lib/bookings/availability'
import { isDate } from '@/lib/bookings/time'

// GET /api/agents/:id/availability?date=YYYY-MM-DD – volné sloty agenta pro den (v jeho časové zóně)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAgentAccess(params)
  if ('response' in ctx) return ctx.response
  const date = new URL(request.url).searchParams.get('date')
  if (!isDate(date)) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  try {
    const slots = await getFreeSlots(ctx.agent, date)
    return NextResponse.json({ date, timezone: ctx.agent.timezone, slots })
  } catch (e) {
    console.error('Failed to compute availability', e)
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 })
  }
}
