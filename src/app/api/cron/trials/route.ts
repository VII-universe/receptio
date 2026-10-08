import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { syncCallsPaused } from '@/lib/billing/check-limit'
import { sendTrialEmail } from '@/lib/email/send-trial-ending'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const DAY_MS = 86400000

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization')
  if (!secret || !header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Denní úloha pro trial bez karty (trial žije v DB, ne ve Stripe, proto Stripe trial_will_end nepřijde):
 * 1) 2 dny před koncem pošle upozornění (jednou, viz trial_reminder_sent_at),
 * 2) po skončení trialu pozastaví hovory a pošle e-mail "trial skončil" (jednou, při přechodu do pozastavení).
 * Workspaces s placeným plánem se přeskakují. Vyžaduje CRON_SECRET.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const now = new Date()
  let reminded = 0
  let ended = 0

  // 1) Upozornění na konec
  const { data: ending, error: endingError } = await supabase
    .from('workspaces')
    .select('id, trial_ends_at')
    .eq('plan', 'free')
    .is('trial_reminder_sent_at', null)
    .gt('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', new Date(now.getTime() + 2 * DAY_MS).toISOString())
  if (endingError) {
    console.error('Cron trials: reminder query failed', endingError)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  for (const w of ending ?? []) {
    // Nejdřív se označí (podmíněně), aby souběžný běh neposlal e-mail dvakrát.
    const { data: claimed } = await supabase
      .from('workspaces')
      .update({ trial_reminder_sent_at: now.toISOString() })
      .eq('id', w.id)
      .is('trial_reminder_sent_at', null)
      .select('id')
    if (!claimed?.length) continue
    const daysLeft = Math.max(1, Math.ceil((new Date(w.trial_ends_at!).getTime() - now.getTime()) / DAY_MS))
    await sendTrialEmail({ workspaceId: w.id, variant: 'ending', daysLeft })
      .then(() => reminded++)
      .catch((e) => console.error('Cron trials: reminder email failed', w.id, e))
  }

  // 2) Skončený trial bez placeného plánu
  const { data: expired, error: expiredError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('plan', 'free')
    .eq('calls_paused', false)
    .lte('trial_ends_at', now.toISOString())
  if (expiredError) {
    console.error('Cron trials: expired query failed', expiredError)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  for (const w of expired ?? []) {
    try {
      const { justPaused } = await syncCallsPaused(w.id)
      if (justPaused) {
        await sendTrialEmail({ workspaceId: w.id, variant: 'ended' })
        ended++
      }
    } catch (e) {
      console.error('Cron trials: expiring trial failed', w.id, e)
    }
  }

  return NextResponse.json({ reminded, ended })
}
