import { NextResponse } from 'next/server'
import { requireApiKey, requireScope } from '@/lib/api-keys/middleware'
import { publicAgent } from '@/lib/api-keys/public-api'
import { getAgentsByWorkspaceId } from '@/lib/supabase/queries'
import { apiError } from '@/lib/api-keys/middleware'

// GET /api/v1/agents
export async function GET(request: Request) {
  const auth = await requireApiKey(request)
  if (auth instanceof Response) return auth
  const forbidden = requireScope(auth.scopes, 'read')
  if (forbidden) return forbidden

  try {
    const agents = await getAgentsByWorkspaceId(auth.workspaceId)
    return NextResponse.json({ data: agents.map(publicAgent) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('API v1 agents failed', e)
    return apiError(500, 'Internal error')
  }
}
