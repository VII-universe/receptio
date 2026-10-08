import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { CALLS_PAGE_SIZE, decodeCursor, getAgentCallsPage, getAgentMonthlyStats } from '@/lib/agents/agent-calls'
import { getAgentById, isUuid } from '@/lib/supabase/queries'

// GET /api/agents/:id/calls?cursor=…&limit=50
// Hovory agenta od nejnovějšího (limit nejvýše 50, stránkování kurzorem). První stránka (bez cursor) obsahuje i měsíční souhrn.
// Číslo volajícího se vrací jen anonymizované; přepis se načítá zvlášť (GET /api/calls/:id).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  const agent = await getAgentById(ctx.workspace.id, id)
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const search = new URL(request.url).searchParams
  const rawCursor = search.get('cursor')
  const cursor = rawCursor ? decodeCursor(rawCursor) : null
  if (rawCursor && !cursor) return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
  const limit = Math.min(CALLS_PAGE_SIZE, Math.max(1, parseInt(search.get('limit') ?? '', 10) || CALLS_PAGE_SIZE))

  try {
    const [page, stats] = await Promise.all([
      getAgentCallsPage(ctx.workspace.id, agent.id, cursor, limit),
      cursor ? Promise.resolve(null) : getAgentMonthlyStats(ctx.workspace.id, agent.id),
    ])
    return NextResponse.json({ ...page, ...(stats ? { stats } : {}) })
  } catch (e) {
    console.error('Failed to load agent calls', e)
    return NextResponse.json({ error: 'Failed to load calls' }, { status: 500 })
  }
}
