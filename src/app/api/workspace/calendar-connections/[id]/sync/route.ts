import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { getConnection } from '@/lib/calendar/connections'
import { syncConnection } from '@/lib/calendar/sync'
import { isUuid } from '@/lib/supabase/queries'

export const maxDuration = 60

// POST – ruční synchronizace
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
  const conn = await getConnection(ctx.workspace.id, id)
  if (!conn) return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
  const result = await syncConnection(conn)
  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
