import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { normalizePhoneValue } from '@/lib/bookings/phone'
import { agentHasOutboundNumber, placeOutboundCall, planAllowsOutbound } from '@/lib/outbound/service'
import { testSchema } from '@/lib/outbound/schema'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentById } from '@/lib/supabase/queries'

const TESTS_PER_HOUR = 3

// POST /api/outbound/test  Body: { agent_id, phone_number }
// Okamžitý zkušební hovor s textem první aktivní šablony (jinak výchozím). Jen plán Business a Pro.
export async function POST(request: Request) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { workspace } = ctx

  const parsed = testSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  if (!planAllowsOutbound(workspace)) return NextResponse.json({ error: 'Outbound calls require the Business or Pro plan', code: 'plan' }, { status: 403 })

  const agent = await getAgentById(workspace.id, parsed.data.agent_id)
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  if (!(await agentHasOutboundNumber(agent.id))) return NextResponse.json({ error: 'The agent has no phone number to call from', code: 'no_number' }, { status: 422 })

  const supabase = createAdminClient()
  // Zkušební hovor stojí minuty a peníze: nejvýše 3 za hodinu na workspace.
  const { count } = await supabase
    .from('outbound_calls')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id)
    .eq('is_test', true)
    .gte('created_at', new Date(Date.now() - 3_600_000).toISOString())
  if ((count ?? 0) >= TESTS_PER_HOUR) return NextResponse.json({ error: 'Too many test calls, try again later', code: 'rate_limit' }, { status: 429 })

  const { data: template } = await supabase.from('outbound_templates').select('*').eq('agent_id', agent.id).eq('active', true).order('created_at').limit(1).maybeSingle()
  const { data: row, error } = await supabase
    .from('outbound_calls')
    .insert({
      agent_id: agent.id,
      workspace_id: workspace.id,
      template_id: template?.id ?? null,
      phone_number: normalizePhoneValue(parsed.data.phone_number),
      customer_name: 'Test',
      scheduled_at: new Date().toISOString(),
      is_test: true,
    })
    .select('*')
    .single()
  if (error) {
    console.error('Outbound: failed to save test call', error)
    return NextResponse.json({ error: 'Failed to save the call' }, { status: 500 })
  }

  const result = await placeOutboundCall(row, template ?? null, null)
  const { data: updated } = await supabase.from('outbound_calls').select('*').eq('id', row.id).single()
  return NextResponse.json({ call: updated ?? row, ok: result.ok, ...(result.error ? { error: result.error } : {}) })
}
