import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { BOOKING_COLUMNS } from '@/lib/bookings/service'
import { notifyCustomer } from '@/lib/bookings/notify'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Booking } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const HOUR = 3_600_000
// Připomenutí jde zhruba den předem: rezervace začínající za 20–24 hodin. Běh každou hodinu zajistí, že žádná neunikne;
// rezervace vytvořené méně než 20 h předem připomenutí nedostanou (potvrzení právě odešlo).
const FROM_HOURS = 20
const TO_HOURS = 24

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization')
  if (!secret || !header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Hodinová úloha: SMS s připomenutím zákazníkům potvrzených rezervací. Vyžaduje CRON_SECRET. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const now = Date.now()
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_COLUMNS)
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .gte('starts_at', new Date(now + FROM_HOURS * HOUR).toISOString())
    .lt('starts_at', new Date(now + TO_HOURS * HOUR).toISOString())
    .limit(500)
  if (error) {
    console.error('Cron booking reminders: query failed (is migration 031 applied?)', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  let sent = 0
  let skipped = 0
  for (const b of (data ?? []) as Booking[]) {
    // Označí se až po úspěšném odeslání: bez nastavené SMS brány se připomenutí odešle, jakmile ji doplníte.
    if (await notifyCustomer(b, 'reminder')) {
      await supabase.from('bookings').update({ reminder_sent_at: new Date().toISOString() }).eq('id', b.id)
      sent++
    } else skipped++ // bez čísla, bez SMS brány nebo vypnuto u agenta
  }
  return NextResponse.json({ checked: data?.length ?? 0, sent, skipped })
}
