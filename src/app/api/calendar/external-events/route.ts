import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { isMissingTable } from '@/lib/bookings/time'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/calendar/external-events?date_from=ISO&date_to=ISO – události z napojených kalendářů pro zobrazení v kalendáři
export async function GET(request: Request) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  const sp = new URL(request.url).searchParams
  const from = sp.get('date_from')
  const to = sp.get('date_to')
  if (!from || !to || Number.isNaN(new Date(from).getTime()) || Number.isNaN(new Date(to).getTime())) {
    return NextResponse.json({ error: 'date_from and date_to are required' }, { status: 400 })
  }
  const { data, error } = await createAdminClient()
    .from('external_events')
    .select('id, title, starts_at, ends_at, all_day, transparent, connection:calendar_connections(name)')
    .eq('workspace_id', ctx.workspace.id)
    .lt('starts_at', to)
    .gt('ends_at', from)
    .order('starts_at')
    .limit(1500)
  // Bez migrace 032 se vrací prázdný seznam, ať kalendář s rezervacemi funguje dál.
  if (error) {
    if (!isMissingTable(error.code)) console.error('Failed to load external events', error)
    return NextResponse.json({ events: [] })
  }
  return NextResponse.json({
    events: data.map((e) => {
      const c = e.connection as { name: string } | { name: string }[] | null
      return { id: e.id, title: e.title, starts_at: e.starts_at, ends_at: e.ends_at, all_day: e.all_day, transparent: e.transparent, source: (Array.isArray(c) ? c[0]?.name : c?.name) ?? '' }
    }),
  })
}
