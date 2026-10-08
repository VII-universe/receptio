import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { syncAllConnections } from '@/lib/calendar/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization')
  if (!secret || !header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Každých 10 minut: načte změny ze všech napojených kalendářů, takže události zadané jinde se objeví v Receptiu. Vyžaduje CRON_SECRET. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await syncAllConnections())
}
