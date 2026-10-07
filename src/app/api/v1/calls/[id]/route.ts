import { NextResponse } from 'next/server'
import { apiError, requireApiKey, requireScope } from '@/lib/api-keys/middleware'
import { publicCall } from '@/lib/api-keys/public-api'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'

// GET /api/v1/calls/:id – detail včetně textového přepisu a shrnutí
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiKey(request)
  if (auth instanceof Response) return auth
  const forbidden = requireScope(auth.scopes, 'read')
  if (forbidden) return forbidden

  const { id } = await params
  if (!isUuid(id)) return apiError(404, 'Call not found')

  const { data, error } = await createAdminClient()
    .from('call_logs')
    .select('id, agent_id, caller_number, duration_seconds, ended_reason, summary, transcript, started_at, ended_at, created_at')
    .eq('id', id)
    .eq('workspace_id', auth.workspaceId)
    .maybeSingle()
  if (error) {
    console.error('API v1 call failed', error.message)
    return apiError(500, 'Internal error')
  }
  if (!data) return apiError(404, 'Call not found')

  return NextResponse.json(
    { data: { ...publicCall(data as never), transcript: data.transcript } },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
