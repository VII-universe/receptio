import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { agentHasOutboundNumber, placeOutboundCall, planAllowsOutbound } from '@/lib/outbound/service'
import { nextAllowedStart } from '@/lib/outbound/window'
import { triggerSchema } from '@/lib/outbound/schema'
import { normalizePhoneValue } from '@/lib/bookings/phone'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentById } from '@/lib/supabase/queries'

// POST /api/outbound/trigger
// Body: { agent_id, template_id, phone_number, customer_name, scheduled_at? }
// Zařadí hovor do fronty. Do 60 s od teď se zavolá hned (v povoleném okně), jinak ho vezme minutový cron.
export async function POST(request: Request) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { workspace } = ctx

  const parsed = triggerSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  const input = parsed.data

  if (!planAllowsOutbound(workspace)) return NextResponse.json({ error: 'Outbound calls require the Business or Pro plan', code: 'plan' }, { status: 403 })
  const agent = await getAgentById(workspace.id, input.agent_id)
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  if (!(await agentHasOutboundNumber(agent.id))) return NextResponse.json({ error: 'The agent has no phone number to call from', code: 'no_number' }, { status: 422 })

  const supabase = createAdminClient()
  const { data: settings } = await supabase.from('outbound_settings').select('gdpr_confirmed').eq('agent_id', agent.id).maybeSingle()
  if (settings?.gdpr_confirmed !== true) return NextResponse.json({ error: 'Outbound calls are not confirmed yet', code: 'gdpr' }, { status: 403 })

  const { data: template } = await supabase.from('outbound_templates').select('*').eq('id', input.template_id).eq('agent_id', agent.id).eq('workspace_id', workspace.id).maybeSingle()
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const now = new Date()
  let scheduledAt = input.scheduled_at ? new Date(input.scheduled_at) : now
  const immediate = scheduledAt.getTime() <= now.getTime() + 60_000
  // Hovor mimo povolené hodiny se odloží na začátek okna, i když je žádán "hned".
  if (immediate) scheduledAt = nextAllowedStart(now, agent.timezone ?? 'Europe/Prague', template.allowed_hours_from, template.allowed_hours_to)
  const callNow = scheduledAt.getTime() <= now.getTime() + 60_000

  const { data: row, error } = await supabase
    .from('outbound_calls')
    .insert({
      agent_id: agent.id,
      workspace_id: workspace.id,
      template_id: template.id,
      phone_number: normalizePhoneValue(input.phone_number),
      customer_name: input.customer_name,
      scheduled_at: scheduledAt.toISOString(),
    })
    .select('*')
    .single()
  if (error) {
    console.error('Outbound: failed to queue call', error)
    return NextResponse.json({ error: 'Failed to save the call' }, { status: 500 })
  }

  if (!callNow) return NextResponse.json({ call: row, queued: true }, { status: 201 })
  const result = await placeOutboundCall(row, template, null)
  const { data: updated } = await supabase.from('outbound_calls').select('*').eq('id', row.id).single()
  return NextResponse.json({ call: updated ?? row, queued: false, ok: result.ok, ...(result.error ? { error: result.error } : {}) }, { status: result.ok ? 201 : 200 })
}
