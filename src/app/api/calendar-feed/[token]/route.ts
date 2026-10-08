import { NextResponse } from 'next/server'
import { buildFeed } from '@/lib/calendar/ical'
import { loadFeedBookings } from '@/lib/calendar/feed'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'

export const dynamic = 'force-dynamic'

// GET /api/calendar-feed/<token>.ics[?agent=<id>] – živý iCal feed rezervací pro odběr v Apple Kalendáři, Google, Outlooku…
// Bez přihlášení: přístup je daný tajným odkazem (token jde v nastavení kdykoli obnovit).
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/i, '')
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return new NextResponse('Not found', { status: 404 })
  const { data: ws, error } = await createAdminClient().from('workspaces').select('id, name').eq('calendar_feed_token', token).maybeSingle()
  if (error || !ws) return new NextResponse('Not found', { status: 404 })

  const agent = new URL(request.url).searchParams.get('agent')
  try {
    const events = await loadFeedBookings(ws.id, agent && isUuid(agent) ? agent : undefined)
    return new NextResponse(buildFeed(`Receptio – ${ws.name}`, events), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="receptio.ics"',
        'Cache-Control': 'private, max-age=300',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (e) {
    console.error('Calendar feed failed', e)
    return new NextResponse('Error', { status: 500 })
  }
}
