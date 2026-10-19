import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'

// GET /api/outbound/calls?agentId=…  Posledních 100 odchozích hovorů workspace (nejnovější první).
export async function GET(request: Request) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const agentId = new URL(request.url).searchParams.get('agentId')
  if (agentId && !isUuid(agentId)) return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 })

  let query = createAdminClient()
    .from('outbound_calls')
    .select('id, agent_id, customer_name, phone_number, scheduled_at, status, error_message, is_test, created_at')
    .eq('workspace_id', ctx.workspace.id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (agentId) query = query.eq('agent_id', agentId)
  const { data, error } = await query
  if (error) {
    console.error('Outbound: failed to load calls', error)
    return NextResponse.json({ error: 'Failed to load calls' }, { status: 500 })
  }
  return NextResponse.json({ calls: data })
}
