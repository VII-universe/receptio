import 'server-only'
import { isCompletedReason } from '@/lib/calls'
import { effectivePlan } from '@/lib/billing/get-workspace-plan'
import { PLAN_LIMITS } from '@/lib/billing/plans'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentsByWorkspaceId } from '@/lib/supabase/queries'
import type { Workspace } from '@/types'

export const RANGES = [7, 30, 90] as const
export type Range = (typeof RANGES)[number]
export const parseRange = (v: unknown): Range => {
  const n = Number(v)
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : 30
}

export interface Kpis {
  calls: number
  totalMinutes: number
  avgDuration: number // sekundy
  completionRate: number // %
}

export interface Analytics {
  range: Range
  kpis: Kpis & { prevCalls: number; prevMinutes: number; prevAvgDuration: number; prevCompletionRate: number }
  callsByDay: { date: string; count: number; minutes: number }[]
  callsByHour: { hour: number; count: number }[]
  agentStats: { agentId: string; name: string; calls: number; totalMinutes: number; avgDuration: number; completionRate: number }[]
  planUsage: { used: number; limit: number; plan: string } // limit -1 = neomezeno
}

const TZ = 'Europe/Prague'
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }) // YYYY-MM-DD
const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' })

/** Posledních n kalendářních dní (v české časové zóně) končících dneškem, od nejstaršího. */
function lastDays(n: number, now: Date, offsetDays = 0): string[] {
  const today = dayFmt.format(now)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - offsetDays - (n - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

interface Row {
  agent_id: string
  duration_seconds: number | null
  ended_reason: string | null
  at: string // started_at ?? created_at
}

/** Hovory workspace od data `since`, po stránkách (PostgREST vrací max. 1000 řádků); strop 50 000. */
async function fetchRows(workspaceId: string, since: Date): Promise<Row[]> {
  const supabase = createAdminClient()
  const rows: Row[] = []
  for (let page = 0; page < 50; page++) {
    const { data, error } = await supabase
      .from('call_logs')
      .select('agent_id, duration_seconds, ended_reason, started_at, created_at')
      .eq('workspace_id', workspaceId) // vždy jen hovory tohoto workspace
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .range(page * 1000, page * 1000 + 999)
    if (error) throw error
    rows.push(
      ...data.map((r) => ({
        agent_id: r.agent_id,
        duration_seconds: r.duration_seconds,
        ended_reason: r.ended_reason,
        at: r.started_at ?? r.created_at,
      }))
    )
    if (data.length < 1000) break
  }
  return rows
}

function summarize(rows: Row[]): Kpis {
  const withDuration = rows.filter((r) => (r.duration_seconds ?? 0) > 0)
  const seconds = rows.reduce((s, r) => s + (r.duration_seconds ?? 0), 0)
  const ended = rows.filter((r) => r.ended_reason != null)
  return {
    calls: rows.length,
    totalMinutes: Math.round(seconds / 60),
    avgDuration: withDuration.length ? seconds / withDuration.length : 0,
    // dokončený = ukončil zákazník nebo agent; jmenovatelem jsou hovory se známým důvodem ukončení
    completionRate: ended.length ? (ended.filter((r) => isCompletedReason(r.ended_reason)).length / ended.length) * 100 : 0,
  }
}

export async function getAnalytics(workspace: Workspace, range: Range): Promise<Analytics> {
  const now = new Date()
  const currentDays = lastDays(range, now)
  const previousDays = lastDays(range, now, range)
  const currentSet = new Set(currentDays)
  const previousSet = new Set(previousDays)

  // Dva dny navíc kryjí posun časové zóny; přesné rozdělení dělá klíč dne v pražské zóně.
  const since = new Date(now.getTime() - (range * 2 + 2) * 86400000)
  const [rows, agents] = await Promise.all([fetchRows(workspace.id, since), getAgentsByWorkspaceId(workspace.id)])

  const current: Row[] = []
  const previous: Row[] = []
  const perDay = new Map(currentDays.map((d) => [d, { count: 0, seconds: 0 }]))
  const perHour = Array.from({ length: 24 }, () => 0)

  for (const r of rows) {
    const d = new Date(r.at)
    const key = dayFmt.format(d)
    if (currentSet.has(key)) {
      current.push(r)
      const day = perDay.get(key)!
      day.count++
      day.seconds += r.duration_seconds ?? 0
      perHour[Number(hourFmt.format(d)) % 24]++
    } else if (previousSet.has(key)) {
      previous.push(r)
    }
  }

  const cur = summarize(current)
  const prev = summarize(previous)

  const byAgent = new Map<string, Row[]>()
  for (const r of current) byAgent.set(r.agent_id, [...(byAgent.get(r.agent_id) ?? []), r])

  // Expirované fakturační období (např. plán Zdarma) se počítá jako vynulované.
  const expired = workspace.billing_period_end && new Date(workspace.billing_period_end) <= now

  return {
    range,
    kpis: {
      ...cur,
      prevCalls: prev.calls,
      prevMinutes: prev.totalMinutes,
      prevAvgDuration: prev.avgDuration,
      prevCompletionRate: prev.completionRate,
    },
    callsByDay: currentDays.map((date) => {
      const d = perDay.get(date)!
      return { date, count: d.count, minutes: Math.round(d.seconds / 60) }
    }),
    callsByHour: perHour.map((count, hour) => ({ hour, count })),
    agentStats: agents.map((a) => {
      const s = summarize(byAgent.get(a.id) ?? [])
      return { agentId: a.id, name: a.name, calls: s.calls, totalMinutes: s.totalMinutes, avgDuration: s.avgDuration, completionRate: s.completionRate }
    }),
    planUsage: {
      used: expired ? 0 : (workspace.minutes_used ?? 0),
      limit: PLAN_LIMITS[effectivePlan(workspace.plan, workspace.plan_status, workspace.trial_ends_at)].minutesPerMonth,
      plan: workspace.plan ?? 'free',
    },
  }
}
