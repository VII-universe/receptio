import { NextResponse } from 'next/server'
import { requireOwnedAgent } from '@/lib/agents/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'
import { resourcePatchSchema } from '@/lib/bookings/resource-schema'

type Ctx = { params: Promise<{ id: string; resourceId: string }> }

// PATCH – úprava zdroje (název, typ, kapacita, popis, aktivní, pořadí)
export async function PATCH(request: Request, { params }: Ctx) {
  const p = await params
  const ctx = await requireOwnedAgent(Promise.resolve({ id: p.id }))
  if ('response' in ctx) return ctx.response
  if (!isUuid(p.resourceId)) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  const parsed = resourcePatchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  const { data, error } = await createAdminClient().from('booking_resources').update(parsed.data).eq('id', p.resourceId).eq('agent_id', ctx.agent.id).select('*').maybeSingle()
  if (error) {
    console.error('Failed to update booking resource', error)
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  return NextResponse.json({ resource: data })
}

// DELETE – smaže zdroj; jeho rezervace zůstanou (jen bez přiřazeného zdroje)
export async function DELETE(_request: Request, { params }: Ctx) {
  const p = await params
  const ctx = await requireOwnedAgent(Promise.resolve({ id: p.id }))
  if ('response' in ctx) return ctx.response
  if (!isUuid(p.resourceId)) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  const { data, error } = await createAdminClient().from('booking_resources').delete().eq('id', p.resourceId).eq('agent_id', ctx.agent.id).select('id')
  if (error) return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
