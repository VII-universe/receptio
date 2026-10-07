import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncCallsPaused } from '@/lib/billing/check-limit'

export const dynamic = 'force-dynamic'

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization')
  if (!secret || !header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Denní úloha (Vercel Cron, viz vercel.json): vynuluje spotřebu minut u workspaces, jejichž fakturační období skončilo,
 * a obnoví jim hovory. Období řídí billing_period_* (u placených plánů Stripe, u Zdarma kalendářní měsíc),
 * proto se neresetuje všem naráz prvního v měsíci – to by předplatitelům s obnovou uprostřed měsíce dalo dvojí limit.
 * Vyžaduje env CRON_SECRET (Vercel ho posílá jako Authorization: Bearer).
 */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('workspaces')
    .update({ minutes_used: 0, calls_paused: false, minutes_reset_at: new Date().toISOString() })
    .lte('billing_period_end', new Date().toISOString())
    .or('minutes_used.gt.0,calls_paused.eq.true')
    .select('id')
  if (error) {
    console.error('Cron: minutes reset failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // Plán Zdarma má limit 0 minut: po resetu se hovory zase pozastaví, ostatní zůstanou odblokované.
  for (const w of data ?? []) await syncCallsPaused(w.id).catch((e) => console.error('Cron: sync failed', w.id, e))
  return NextResponse.json({ reset: data?.length ?? 0 })
}
