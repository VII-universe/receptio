import { NextResponse } from 'next/server'
import { redirectRulesSchema, rowFromRule } from '@/lib/agents/redirect-rules'
import { requireOwnedAgent } from '@/lib/agents/route-helpers'
import { getRedirectRules, syncAgentKnowledge } from '@/lib/agents/sync-knowledge'
import { createAdminClient } from '@/lib/supabase/admin'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/agents/:id/redirect-rules – pravidla seřazená podle priority
export async function GET(_request: Request, { params }: Ctx) {
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response
  try {
    return NextResponse.json({ rules: await getRedirectRules(ctx.workspace.id, ctx.agent.id) })
  } catch (e) {
    console.error('Failed to load redirect rules', e)
    return NextResponse.json({ error: 'Failed to load redirect rules' }, { status: 500 })
  }
}

// PUT /api/agents/:id/redirect-rules
// Body: { rules: [{ trigger: { type, … }, action: { type, … } }] } – pořadí v poli = priorita; nahradí celý seznam
export async function PUT(request: Request, { params }: Ctx) {
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response
  const { workspace, agent } = ctx

  const body = await request.json().catch(() => null)
  const parsed = redirectRulesSchema.safeParse(body?.rules)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid rules', issues: parsed.error.issues }, { status: 400 })
  }

  const supabase = createAdminClient()
  // Nejdřív vložíme nová pravidla a teprve pak smažeme stará, ať při chybě nezůstane agent bez pravidel.
  const { data: old, error: oldError } = await supabase
    .from('redirect_rules')
    .select('id')
    .eq('agent_id', agent.id)
    .eq('workspace_id', workspace.id)
  if (oldError) {
    console.error('Failed to load existing redirect rules', oldError)
    return NextResponse.json({ error: 'Failed to save redirect rules' }, { status: 500 })
  }

  if (parsed.data.length > 0) {
    const { error } = await supabase.from('redirect_rules').insert(
      parsed.data.map((rule, i) => ({ ...rowFromRule(rule), priority: i, agent_id: agent.id, workspace_id: workspace.id }))
    )
    if (error) {
      console.error('Failed to insert redirect rules', error)
      return NextResponse.json({ error: 'Failed to save redirect rules' }, { status: 500 })
    }
  }
  const oldIds = (old ?? []).map((r) => r.id)
  if (oldIds.length > 0) {
    const { error } = await supabase.from('redirect_rules').delete().in('id', oldIds)
    if (error) {
      console.error('Failed to delete old redirect rules', error)
      return NextResponse.json({ error: 'Failed to save redirect rules' }, { status: 500 })
    }
  }

  return NextResponse.json({ rules: parsed.data, sync: await syncAgentKnowledge(agent) })
}
