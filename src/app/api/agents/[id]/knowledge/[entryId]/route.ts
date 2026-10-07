import { NextResponse } from 'next/server'
import { MAX_CONTENT, MAX_TITLE } from '@/lib/agents/knowledge'
import { requireOwnedAgent } from '@/lib/agents/route-helpers'
import { syncAgentKnowledge } from '@/lib/agents/sync-knowledge'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'

type Ctx = { params: Promise<{ id: string; entryId: string }> }

// PATCH /api/agents/:id/knowledge/:entryId  Body: { title?, content?, sort_order? }
export async function PATCH(request: Request, { params }: Ctx) {
  const { entryId } = await params
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response
  if (!isUuid(entryId)) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const update: Record<string, string | number> = {}
  if ('title' in body) {
    const t = typeof body.title === 'string' ? body.title.trim() : ''
    if (!t || t.length > MAX_TITLE) return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
    update.title = t
  }
  if ('content' in body) {
    const c = typeof body.content === 'string' ? body.content.trim() : ''
    if (!c || c.length > MAX_CONTENT) return NextResponse.json({ error: 'Invalid content' }, { status: 400 })
    update.content = c
  }
  if ('sort_order' in body) {
    if (!Number.isInteger(body.sort_order)) return NextResponse.json({ error: 'Invalid sort_order' }, { status: 400 })
    update.sort_order = body.sort_order
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await createAdminClient()
    .from('knowledge_entries')
    .update(update)
    .eq('id', entryId)
    .eq('agent_id', ctx.agent.id)
    .eq('workspace_id', ctx.workspace.id)
    .select('*')
    .maybeSingle()
  if (error) {
    console.error('Failed to update knowledge entry', error)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  return NextResponse.json({ entry: data, sync: await syncAgentKnowledge(ctx.agent) })
}

// DELETE /api/agents/:id/knowledge/:entryId
export async function DELETE(_request: Request, { params }: Ctx) {
  const { entryId } = await params
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response
  if (!isUuid(entryId)) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  const { data, error } = await createAdminClient()
    .from('knowledge_entries')
    .delete()
    .eq('id', entryId)
    .eq('agent_id', ctx.agent.id)
    .eq('workspace_id', ctx.workspace.id)
    .select('id')
  if (error) {
    console.error('Failed to delete knowledge entry', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
  if (!data || data.length === 0) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  return NextResponse.json({ deleted: true, sync: await syncAgentKnowledge(ctx.agent) })
}
