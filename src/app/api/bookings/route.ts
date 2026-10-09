import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { BookingError, listBookings } from '@/lib/bookings/service'
import { isUuid } from '@/lib/supabase/queries'
import type { BookingStatus } from '@/types'

const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'no_show']

// GET /api/bookings?agent_id=&date_from=&date_to=&status=&limit=&cursor= – rezervace všech agentů workspace (kalendář)
export async function GET(request: Request) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  const sp = new URL(request.url).searchParams
  const agentId = sp.get('agent_id')
  const status = sp.get('status')
  if (agentId && !isUuid(agentId)) return NextResponse.json({ error: 'Invalid agent_id' }, { status: 400 })
  if (status && !STATUSES.includes(status as BookingStatus)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  for (const k of ['date_from', 'date_to'] as const) {
    const v = sp.get(k)
    if (v && Number.isNaN(new Date(v).getTime())) return NextResponse.json({ error: `Invalid ${k}` }, { status: 400 })
  }
  try {
    return NextResponse.json(
      await listBookings({
        workspaceId: ctx.workspace.id,
        agentId: agentId ?? undefined,
        dateFrom: sp.get('date_from') ?? undefined,
        dateTo: sp.get('date_to') ?? undefined,
        status: (status as BookingStatus | null) ?? undefined,
        limit: Number(sp.get('limit')) || undefined,
        cursor: sp.get('cursor'),
      })
    )
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('Failed to list bookings', e)
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 })
  }
}
