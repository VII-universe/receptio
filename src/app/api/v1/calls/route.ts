import { NextResponse } from 'next/server'
import { apiError, requireApiKey, requireScope } from '@/lib/api-keys/middleware'
import { publicCall } from '@/lib/api-keys/public-api'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'

// GET /api/v1/calls?limit=20&offset=0&agent_id=...
export async function GET(request: Request) {
  const auth = await requireApiKey(request)
  if (auth instanceof Response) return auth
  const forbidden = requireScope(auth.scopes, 'read')
  if (forbidden) return forbidden

  const params = new URL(request.url).searchParams
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '20', 10) || 20))
  const offset = Math.max(0, parseInt(params.get('offset') ?? '0', 10) || 0)
  const agentId = params.get('agent_id')
  if (agentId && !isUuid(agentId)) return apiError(400, 'Invalid agent_id')

  // Sloupce bez přepisu a ceny.
  let query = createAdminClient()
    .from('call_logs')
    .select(
      'id, agent_id, caller_number, duration_seconds, ended_reason, summary, started_at, ended_at, created_at',
      { count: 'exact' }
    )
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (agentId) query = query.eq('agent_id', agentId)

  const { data, error, count } = await query
  if (error) {
    console.error('API v1 calls failed', error.message)
    return apiError(500, 'Internal error')
  }
  return NextResponse.json(
    { data: (data as never[]).map(publicCall), total: count ?? 0, limit, offset },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
