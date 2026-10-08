import { NextResponse, type NextRequest } from 'next/server'
import { getConnection, insertConnection } from '@/lib/calendar/connections'
import { exchangeGoogleCode, googleConfigured, verifyOAuthState } from '@/lib/calendar/google'
import { syncConnection } from '@/lib/calendar/sync'
import { requireWorkspaceAdmin } from '@/lib/api-auth'

const COOKIE = 'rc_gcal_state'
const back = (req: NextRequest, status: string) => {
  const res = NextResponse.redirect(new URL(`/dashboard/settings?tab=kalendare&calendar=${status}`, req.url))
  res.cookies.delete({ name: COOKIE, path: '/api/workspace/calendar-connections/google' })
  return res
}

// GET – návrat z Google: ověří state, vymění kód za tokeny, uloží napojení a spustí první synchronizaci
export async function GET(request: NextRequest) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return back(request, 'denied')
  const sp = request.nextUrl.searchParams
  if (sp.get('error') || !sp.get('code')) return back(request, 'cancelled')
  if (!googleConfigured() || !verifyOAuthState(sp.get('state'), request.cookies.get(COOKIE)?.value, ctx.workspace.id)) return back(request, 'failed')
  try {
    const config = await exchangeGoogleCode(sp.get('code')!)
    const conn = await insertConnection(ctx.workspace.id, 'google', config.email ? `Google (${config.email})` : 'Google Calendar', config)
    const full = await getConnection(ctx.workspace.id, conn.id)
    if (full) await syncConnection(full)
    return back(request, 'connected')
  } catch (e) {
    console.error('Google Calendar connect failed', e)
    return back(request, 'failed')
  }
}
