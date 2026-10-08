import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { addDays, localDate, zonedToUtc } from './time'

export interface UpcomingBooking {
  id: string
  agentName: string
  callerName: string
  callerPhone: string | null
  title: string
  startsAt: string
  endsAt: string
  status: 'pending' | 'confirmed'
  fromCall: boolean
}

export interface BookingStats {
  today: number
  next7Days: number
  pending: number
  upcoming: UpcomingBooking[]
}

/** Souhrn rezervací pro přehled. Vrací null, když tabulka ještě neexistuje (neprovedená migrace) nebo dotaz selže. */
export async function getBookingStats(workspaceId: string, timezone: string): Promise<BookingStats | null> {
  try {
    const supabase = createAdminClient()
    const now = new Date()
    const day = localDate(now, timezone)
    const todayStart = zonedToUtc(day, '00:00', timezone).toISOString()
    const tomorrowStart = zonedToUtc(addDays(day, 1), '00:00', timezone).toISOString()
    const weekEnd = zonedToUtc(addDays(day, 7), '00:00', timezone).toISOString()
    const base = () => supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId)

    const [today, week, pending, upcoming] = await Promise.all([
      base().neq('status', 'cancelled').gte('starts_at', todayStart).lt('starts_at', tomorrowStart),
      base().neq('status', 'cancelled').gte('starts_at', now.toISOString()).lt('starts_at', weekEnd),
      base().eq('status', 'pending').gte('ends_at', now.toISOString()),
      supabase
        .from('bookings')
        .select('id, caller_name, caller_phone, title, starts_at, ends_at, status, call_log_id, agent:agents(name)')
        .eq('workspace_id', workspaceId)
        .neq('status', 'cancelled')
        .gte('ends_at', now.toISOString())
        .order('starts_at', { ascending: true })
        .limit(6),
    ])
    for (const r of [today, week, pending, upcoming]) if (r.error) throw r.error

    return {
      today: today.count ?? 0,
      next7Days: week.count ?? 0,
      pending: pending.count ?? 0,
      upcoming: (upcoming.data ?? []).map((b) => {
        const agent = b.agent as { name: string } | { name: string }[] | null
        return {
          id: b.id,
          agentName: (Array.isArray(agent) ? agent[0]?.name : agent?.name) ?? '–',
          callerName: b.caller_name,
          callerPhone: b.caller_phone,
          title: b.title,
          startsAt: b.starts_at,
          endsAt: b.ends_at,
          status: b.status as 'pending' | 'confirmed',
          fromCall: !!b.call_log_id,
        }
      }),
    }
  } catch (e) {
    console.error('Dashboard: failed to load booking stats (is migration 030 applied?)', e)
    return null
  }
}
