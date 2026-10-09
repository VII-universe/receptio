import 'server-only'
import { addDays, localDate, isMissingTable } from '@/lib/bookings/time'
import { createAdminClient } from '@/lib/supabase/admin'

export const RANGES = [7, 30, 90] as const
export type Range = (typeof RANGES)[number]
export const isRange = (v: unknown): v is Range => RANGES.includes(Number(v) as Range)

export interface DaySeries {
  date: string // YYYY-MM-DD v časové zóně workspace
  calls: number
  bookings: number // rezervace vytvořené ten den
}

export interface Period {
  calls: number
  bookings: number
  bookedFromCalls: number // rezervace vzniklé z hovorů (call_log_id)
  avgDurationSeconds: number
  missed: number // nezvednuté / neúspěšné hovory
}

export interface OverviewData {
  range: Range
  series: DaySeries[]
  current: Period
  previous: Period
}

type CallRow = { created_at: string; duration_seconds: number | null; status: string; agent_id: string }
type BookingRow = { created_at: string; call_log_id: string | null; agent_id: string }

const EMPTY: Period = { calls: 0, bookings: 0, bookedFromCalls: 0, avgDurationSeconds: 0, missed: 0 }

/** Řádky po stránkách (PostgREST vrací nejvýše 1000 na dotaz). */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string; message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let page = 0; page < 10; page++) {
    const { data, error } = await build(page * 1000, page * 1000 + 999)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

const summarize = (calls: CallRow[], bookings: BookingRow[]): Period => {
  const timed = calls.filter((c) => (c.duration_seconds ?? 0) > 0)
  return {
    calls: calls.length,
    bookings: bookings.length,
    bookedFromCalls: bookings.filter((b) => b.call_log_id).length,
    avgDurationSeconds: timed.length ? timed.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / timed.length : 0,
    missed: calls.filter((c) => c.status === 'missed' || c.status === 'failed').length,
  }
}

/**
 * Data pro přehled: hovory a rezervace za zvolené období po dnech (v časové zóně workspace) a stejně dlouhé
 * předchozí období pro porovnání. Volitelně jen jeden agent. Rezervace se počítají podle data vytvoření
 * (kolik jich za den přibylo), zrušené se nepočítají.
 */
export async function getOverviewData(workspaceId: string, timezone: string, range: Range, agentId?: string): Promise<OverviewData> {
  const supabase = createAdminClient()
  const today = localDate(new Date(), timezone)
  const days = Array.from({ length: range }, (_, i) => addDays(today, i - (range - 1)))
  const prevStart = addDays(days[0], -range)
  // Hranice dotazu s rezervou; přesné zařazení do dne a období dělá localDate níže.
  const since = new Date(Date.now() - (range * 2 + 2) * 86_400_000).toISOString()

  const [calls, bookings] = await Promise.all([
    fetchAll<CallRow>((from, to) => {
      let q = supabase.from('call_logs').select('created_at, duration_seconds, status, agent_id').eq('workspace_id', workspaceId).gte('created_at', since).order('created_at').range(from, to)
      if (agentId) q = q.eq('agent_id', agentId)
      return q
    }),
    fetchAll<BookingRow>((from, to) => {
      let q = supabase.from('bookings').select('created_at, call_log_id, agent_id').eq('workspace_id', workspaceId).not('status', 'in', '(cancelled,no_show)').gte('created_at', since).order('created_at').range(from, to)
      if (agentId) q = q.eq('agent_id', agentId)
      return q
    }).catch((e: { code?: string }) => {
      if (!isMissingTable(e.code)) console.error('Dashboard: failed to load bookings', e) // bez migrace 030 jen bez rezervací
      return [] as BookingRow[]
    }),
  ])

  const key = (iso: string) => localDate(new Date(iso), timezone)
  const inCurrent = (iso: string) => key(iso) >= days[0]
  const inPrevious = (iso: string) => key(iso) >= prevStart && key(iso) < days[0]

  const byDay = new Map(days.map((d) => [d, { date: d, calls: 0, bookings: 0 }]))
  for (const c of calls) {
    const d = byDay.get(key(c.created_at))
    if (d) d.calls += 1
  }
  for (const b of bookings) {
    const d = byDay.get(key(b.created_at))
    if (d) d.bookings += 1
  }

  return {
    range,
    series: days.map((d) => byDay.get(d)!),
    current: summarize(calls.filter((c) => inCurrent(c.created_at)), bookings.filter((b) => inCurrent(b.created_at))),
    previous: summarize(calls.filter((c) => inPrevious(c.created_at)), bookings.filter((b) => inPrevious(b.created_at))),
  }
}

export { EMPTY as EMPTY_PERIOD }
