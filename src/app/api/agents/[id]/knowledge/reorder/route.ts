import { NextResponse } from 'next/server'
import { requireOwnedAgent } from '@/lib/agents/route-helpers'
import { getKnowledgeEntries, syncAgentKnowledge } from '@/lib/agents/sync-knowledge'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/agents/:id/knowledge/reorder  Body: { orderedIds: string[] }
// Nastaví sort_order podle pořadí ID (všechna musí patřit agentovi) a synchronizuje jednou.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response

  const body = await request.json().catch(() => null)
  const ids: unknown = body?.orderedIds
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((i) => typeof i !== 'string') || new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    const existing = await getKnowledgeEntries(ctx.workspace.id, ctx.agent.id)
    const known = new Map(existing.map((e) => [e.id, e]))
    if (ids.some((i) => !known.has(i as string))) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Pořadí se přepíše na pozice 0..n; ostatní záznamy (jiné kategorie) zůstávají.
    const supabase = createAdminClient()
    const results = await Promise.all(
      (ids as string[]).map((id, i) =>
        supabase.from('knowledge_entries').update({ sort_order: i }).eq('id', id).eq('agent_id', ctx.agent.id)
      )
    )
    const failed = results.find((r) => r.error)
    if (failed?.error) throw failed.error

    const sync = await syncAgentKnowledge(ctx.agent)
    return NextResponse.json({ entries: await getKnowledgeEntries(ctx.workspace.id, ctx.agent.id), sync })
  } catch (e) {
    console.error('Failed to reorder knowledge entries', e)
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 })
  }
}
