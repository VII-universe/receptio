import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { getCallLogsPage, isUuid } from '@/lib/supabase/queries'

// GET /api/calls?page=1&limit=20&agentId=...
export async function GET(request: Request) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response

  const params = new URL(request.url).searchParams
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '20', 10) || 20))
  const agentId = params.get('agentId') ?? undefined
  if (agentId && !isUuid(agentId)) {
    return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 })
  }

  try {
    const { calls, total } = await getCallLogsPage(ctx.workspace.id, { page, limit, agentId })
    return NextResponse.json({ calls, total, page, totalPages: Math.ceil(total / limit) })
  } catch (e) {
    console.error('Failed to load calls', e)
    return NextResponse.json({ error: 'Failed to load calls' }, { status: 500 })
  }
}
