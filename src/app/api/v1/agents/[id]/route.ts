import { NextResponse } from 'next/server'
import { apiError, requireApiKey, requireScope } from '@/lib/api-keys/middleware'
import { publicAgent } from '@/lib/api-keys/public-api'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentById } from '@/lib/supabase/queries'

// GET /api/v1/agents/:id – agent s počtem hovorů tento měsíc
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiKey(request)
  if (auth instanceof Response) return auth
  const forbidden = requireScope(auth.scopes, 'read')
  if (forbidden) return forbidden

  try {
    const agent = await getAgentById(auth.workspaceId, (await params).id)
    if (!agent) return apiError(404, 'Agent not found')

    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const { count, error } = await createAdminClient()
      .from('call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', auth.workspaceId)
      .eq('agent_id', agent.id)
      .gte('created_at', monthStart.toISOString())
    if (error) throw error

    return NextResponse.json(
      { data: { ...publicAgent(agent), calls_this_month: count ?? 0 } },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    console.error('API v1 agent failed', e)
    return apiError(500, 'Internal error')
  }
}
