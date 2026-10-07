import { NextResponse } from 'next/server'
import { isKnowledgeCategory, MAX_CONTENT, MAX_ENTRIES_PER_AGENT, MAX_TITLE } from '@/lib/agents/knowledge'
import { requireOwnedAgent } from '@/lib/agents/route-helpers'
import { getKnowledgeEntries, syncAgentKnowledge } from '@/lib/agents/sync-knowledge'
import { createAdminClient } from '@/lib/supabase/admin'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/agents/:id/knowledge – všechny záznamy agenta
export async function GET(_request: Request, { params }: Ctx) {
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response
  try {
    return NextResponse.json({ entries: await getKnowledgeEntries(ctx.workspace.id, ctx.agent.id) })
  } catch (e) {
    console.error('Failed to load knowledge entries', e)
    return NextResponse.json({ error: 'Failed to load entries' }, { status: 500 })
  }
}

// POST /api/agents/:id/knowledge  Body: { category, title, content, sort_order? }
// Po vytvoření se znalostní báze zkompiluje a pošle do Vapi.
export async function POST(request: Request, { params }: Ctx) {
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response
  const { workspace, agent } = ctx

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  if (
    !isKnowledgeCategory(body?.category) ||
    !title ||
    title.length > MAX_TITLE ||
    !content ||
    content.length > MAX_CONTENT ||
    (body.sort_order != null && !Number.isInteger(body.sort_order))
  ) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    const existing = await getKnowledgeEntries(workspace.id, agent.id)
    if (existing.length >= MAX_ENTRIES_PER_AGENT) {
      return NextResponse.json({ error: 'Dosáhli jste maximálního počtu záznamů.' }, { status: 403 })
    }
    const nextOrder = existing.reduce((m, e) => Math.max(m, e.sort_order), -1) + 1

    const { data, error } = await createAdminClient()
      .from('knowledge_entries')
      .insert({
        agent_id: agent.id,
        workspace_id: workspace.id,
        category: body.category,
        title,
        content,
        sort_order: body.sort_order ?? nextOrder,
      })
      .select('*')
      .single()
    if (error) throw error

    const sync = await syncAgentKnowledge(agent)
    return NextResponse.json({ entry: data, sync }, { status: 201 })
  } catch (e) {
    console.error('Failed to create knowledge entry', e)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}
