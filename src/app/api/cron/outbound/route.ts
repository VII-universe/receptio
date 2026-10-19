import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { processOutbound } from '@/lib/outbound/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization')
  if (!secret || !header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Minutová úloha: naplánuje a provede odchozí připomínací hovory. Vyžaduje CRON_SECRET. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await processOutbound())
  } catch (e) {
    console.error('Cron outbound failed', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
