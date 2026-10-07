import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { getAnalytics, parseRange } from '@/lib/analytics'

// GET /api/analytics?range=7|30|90 (výchozí 30) – dostupné i členům týmu (jen čtení)
export async function GET(request: Request) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response

  const range = parseRange(new URL(request.url).searchParams.get('range'))
  try {
    return NextResponse.json(await getAnalytics(ctx.workspace, range), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('Failed to load analytics', e)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
