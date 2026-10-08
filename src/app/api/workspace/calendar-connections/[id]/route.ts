import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { PUBLIC_COLUMNS } from '@/lib/calendar/connections'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'

type Ctx = { params: Promise<{ id: string }> }

// PATCH – zapnutí / vypnutí synchronizace nebo přejmenování
export async function PATCH(request: Request, { params }: Ctx) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { id } = await params
  const parsed = z.object({ sync_enabled: z.boolean().optional(), name: z.string().trim().min(1).max(80).optional() }).safeParse(await request.json().catch(() => null))
  if (!isUuid(id) || !parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { data, error } = await createAdminClient().from('calendar_connections').update(parsed.data).eq('id', id).eq('workspace_id', ctx.workspace.id).select(PUBLIC_COLUMNS).maybeSingle()
  if (error) return NextResponse.json({ error: 'Failed to update calendar' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
  return NextResponse.json({ connection: data })
}

// DELETE – odpojí kalendář; importované blokace se smažou, rezervace zůstávají (jen ztratí vazbu na událost)
export async function DELETE(_request: Request, { params }: Ctx) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
  const supabase = createAdminClient()
  await supabase.from('bookings').update({ external_id: null }).eq('calendar_connection_id', id).eq('workspace_id', ctx.workspace.id)
  const { data, error } = await supabase.from('calendar_connections').delete().eq('id', id).eq('workspace_id', ctx.workspace.id).select('id')
  if (error) return NextResponse.json({ error: 'Failed to disconnect calendar' }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
