import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentById } from '@/lib/supabase/queries'

// POST /api/outbound/gdpr  Body: { agent_id }
// Potvrzení, že firma informuje zákazníky o automatických připomínkách. Bez něj se nic nevolá.
export async function POST(request: Request) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const body = (await request.json().catch(() => null)) as { agent_id?: unknown } | null
  if (typeof body?.agent_id !== 'string') return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const agent = await getAgentById(ctx.workspace.id, body.agent_id)
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const { error } = await createAdminClient()
    .from('outbound_settings')
    .upsert({ agent_id: agent.id, workspace_id: ctx.workspace.id, gdpr_confirmed: true, gdpr_confirmed_at: new Date().toISOString() }, { onConflict: 'agent_id' })
  if (error) {
    console.error('Outbound: failed to save GDPR confirmation', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
  return NextResponse.json({ confirmed: true })
}
