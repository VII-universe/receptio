import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { verifyCaldav } from '@/lib/calendar/caldav'
import { getConnection, insertConnection, listConnections } from '@/lib/calendar/connections'
import { createOAuthState, googleAuthUrl, googleConfigured } from '@/lib/calendar/google'
import { assertPublicUrl, safeFetchText } from '@/lib/calendar/net'
import { syncConnection } from '@/lib/calendar/sync'

const OAUTH_COOKIE = 'rc_gcal_state'

const bodySchema = z.discriminatedUnion('provider', [
  z.object({ provider: z.literal('google') }),
  z.object({ provider: z.literal('ical'), name: z.string().trim().min(1).max(80), url: z.string().trim().min(8).max(2000) }),
  z.object({
    provider: z.literal('caldav'),
    name: z.string().trim().min(1).max(80),
    url: z.string().trim().min(8).max(2000),
    username: z.string().trim().min(1).max(200),
    password: z.string().min(1).max(500),
  }),
])

// GET – napojené kalendáře (bez konfigurace); `google` říká, zda je nastaven Google OAuth
export async function GET() {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  try {
    return NextResponse.json({ connections: await listConnections(ctx.workspace.id), googleAvailable: googleConfigured() })
  } catch (e) {
    console.error('Failed to list calendar connections', e)
    return NextResponse.json({ error: 'Failed to load calendars' }, { status: 500 })
  }
}

// POST – přidá napojení. Google vrací `authUrl` (přesměrování na souhlas); iCal a CalDAV se ověří a uloží hned.
export async function POST(request: Request) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  const body = parsed.data

  try {
    if (body.provider === 'google') {
      if (!googleConfigured()) return NextResponse.json({ error: 'Google Calendar is not configured' }, { status: 503 })
      const { state, nonce } = createOAuthState(ctx.workspace.id)
      const res = NextResponse.json({ authUrl: googleAuthUrl(state) })
      res.cookies.set(OAUTH_COOKIE, nonce, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/workspace/calendar-connections/google', maxAge: 600 })
      return res
    }

    if (body.provider === 'ical') {
      const url = (await assertPublicUrl(body.url)).toString()
      const text = await safeFetchText(url, { headers: { Accept: 'text/calendar, text/plain, */*' } })
      if (!text.includes('BEGIN:VCALENDAR')) return NextResponse.json({ error: 'The address does not return an iCal calendar' }, { status: 400 })
      const conn = await insertConnection(ctx.workspace.id, 'ical', body.name, { url })
      after(async () => {
        const full = await getConnection(ctx.workspace.id, conn.id)
        if (full) await syncConnection(full)
      })
      return NextResponse.json({ connection: conn }, { status: 201 })
    }

    const url = (await assertPublicUrl(body.url)).toString()
    const found = await verifyCaldav({ url, username: body.username, password: body.password })
    const conn = await insertConnection(ctx.workspace.id, 'caldav', body.name, { url, username: body.username, password: body.password, calendar_url: found.calendar_url })
    after(async () => {
      const full = await getConnection(ctx.workspace.id, conn.id)
      if (full) await syncConnection(full)
    })
    return NextResponse.json({ connection: conn }, { status: 201 })
  } catch (e) {
    // Zpráva z ověření (špatné heslo, nedostupná adresa…) pomůže uživateli opravit zadání.
    const message = e instanceof Error ? e.message : 'Failed to connect the calendar'
    console.error('Calendar connection failed', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
