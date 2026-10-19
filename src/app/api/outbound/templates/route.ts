import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { MAX_TEMPLATES_PER_AGENT, templateInputSchema } from '@/lib/outbound/schema'
import { planAllowsOutbound } from '@/lib/outbound/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentById, isUuid } from '@/lib/supabase/queries'

// GET /api/outbound/templates?agentId=…
export async function GET(request: Request) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const agentId = new URL(request.url).searchParams.get('agentId')
  if (!agentId || !isUuid(agentId)) return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 })
  const { data, error } = await createAdminClient()
    .from('outbound_templates')
    .select('id, agent_id, name, trigger_type, delay_hours, message_template, allowed_hours_from, allowed_hours_to, active, created_at')
    .eq('workspace_id', ctx.workspace.id)
    .eq('agent_id', agentId)
    .order('created_at')
  if (error) {
    console.error('Outbound: failed to load templates', error)
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 })
  }
  return NextResponse.json({ templates: data })
}

// POST /api/outbound/templates  Body: { agent_id, ...šablona }
export async function POST(request: Request) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  if (!planAllowsOutbound(ctx.workspace)) return NextResponse.json({ error: 'Outbound calls require the Business or Pro plan', code: 'plan' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const agentId = z.string().uuid().safeParse(body?.agent_id)
  const parsed = templateInputSchema.safeParse(body)
  if (!agentId.success || !parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  const agent = await getAgentById(ctx.workspace.id, agentId.data)
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const supabase = createAdminClient()
  const { count } = await supabase.from('outbound_templates').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id)
  if ((count ?? 0) >= MAX_TEMPLATES_PER_AGENT) return NextResponse.json({ error: 'Template limit reached' }, { status: 409 })

  const { data, error } = await supabase.from('outbound_templates').insert({ ...parsed.data, agent_id: agent.id, workspace_id: ctx.workspace.id }).select('*').single()
  if (error) {
    console.error('Outbound: failed to create template', error)
    return NextResponse.json({ error: 'Failed to save the template' }, { status: 500 })
  }
  return NextResponse.json({ template: data }, { status: 201 })
}
