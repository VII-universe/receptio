import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { getFreeIntervals } from '@/lib/bookings/availability'
import { isDate } from '@/lib/bookings/time'
import { isUuid } from '@/lib/supabase/queries'

// GET /api/calendar/free-time?date=YYYY-MM-DD[&agent_id=] – volné úseky dne (minuty od půlnoci, v zóně workspace)
export async function GET(request: Request) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  const sp = new URL(request.url).searchParams
  const date = sp.get('date')
  const agentId = sp.get('agent_id')
  if (!isDate(date)) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  if (agentId && !isUuid(agentId)) return NextResponse.json({ error: 'Invalid agent_id' }, { status: 400 })
  try {
    return NextResponse.json(await getFreeIntervals(ctx.workspace.id, date, ctx.workspace.timezone ?? 'Europe/Prague', agentId ?? undefined))
  } catch (e) {
    console.error('Failed to compute free time', e)
    return NextResponse.json({ error: 'Failed to load free time' }, { status: 500 })
  }
}
