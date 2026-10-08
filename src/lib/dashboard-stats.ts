import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentsByWorkspaceId, getCallLogsPage } from '@/lib/supabase/queries'
import { agentsLimitFor } from '@/lib/stripe/plans'
import { effectivePlan } from '@/lib/billing/get-workspace-plan'
import { PLAN_LIMITS } from '@/lib/billing/plans'
import type { Workspace } from '@/types'

export interface DashboardStats {
  callsThisMonth: number
  callsLastMonth: number
  callsTrend: number // % změna (kladné = růst); 0, pokud minulý měsíc nebyl žádný hovor
  avgDurationSeconds: number // posledních 30 dní
  minutesUsed: number
  minutesLimit: number // -1 = neomezeno
  activeAgents: number
  totalAgents: number
  agentsLimit: number
  phoneNumbers: number
  callsByDay: { date: string; count: number }[] // posledních 7 dní, nejstarší první (ISO datum)
  plan: string
  planStatus: string
  recentCalls: {
    id: string
    agentName: string
    callerNumber: string | null
    startedAt: string
    durationSeconds: number | null
    endedReason: string | null
    isTest: boolean
  }[]
}

const TZ = 'Europe/Prague'
const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d) // YYYY-MM-DD

/** Posledních 7 kalendářních dní (v české časové zóně), od nejstaršího. */
function lastSevenDays(now: Date): string[] {
  const today = dayKey(now)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
}

/** Řádky call_logs po stránkách (PostgREST vrací max. 1000 řádků na dotaz). */
async function fetchRecentRows(workspaceId: string, since: Date) {
  const supabase = createAdminClient()
  const rows: { created_at: string; duration_seconds: number | null }[] = []
  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabase
      .from('call_logs')
      .select('created_at, duration_seconds')
      .eq('workspace_id', workspaceId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .range(page * 1000, page * 1000 + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows
}

async function countCalls(workspaceId: string, from: Date, to?: Date): Promise<number> {
  let q = createAdminClient()
    .from('call_logs')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .gte('created_at', from.toISOString())
  if (to) q = q.lt('created_at', to.toISOString())
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

export async function getDashboardStats(workspace: Workspace): Promise<DashboardStats> {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

  const [callsThisMonth, callsLastMonth, rows, agents, recent, phoneCount] = await Promise.all([
    countCalls(workspace.id, monthStart),
    countCalls(workspace.id, lastMonthStart, monthStart),
    fetchRecentRows(workspace.id, thirtyDaysAgo),
    getAgentsByWorkspaceId(workspace.id),
    getCallLogsPage(workspace.id, { page: 1, limit: 3 }),
    // Tabulka phone_numbers vzniká až migrací 007 – bez ní se číslo bere jako nepřiřazené.
    createAdminClient()
      .from('phone_numbers')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .then((r) => (r.error ? 0 : (r.count ?? 0))),
  ])

  const withDuration = rows.filter((r) => (r.duration_seconds ?? 0) > 0)
  const avgDurationSeconds = withDuration.length
    ? withDuration.reduce((s, r) => s + (r.duration_seconds ?? 0), 0) / withDuration.length
    : 0

  const days = lastSevenDays(now)
  const perDay = new Map(days.map((d) => [d, 0]))
  for (const r of rows) {
    const k = dayKey(new Date(r.created_at))
    if (perDay.has(k)) perDay.set(k, (perDay.get(k) ?? 0) + 1)
  }

  // Skončené fakturační období (např. plán Zdarma) se počítá jako vynulované.
  const expired = workspace.billing_period_end && new Date(workspace.billing_period_end) <= now

  return {
    callsThisMonth,
    callsLastMonth,
    callsTrend: callsLastMonth > 0 ? ((callsThisMonth - callsLastMonth) / callsLastMonth) * 100 : 0,
    avgDurationSeconds,
    minutesUsed: expired ? 0 : (workspace.minutes_used ?? 0),
    minutesLimit: PLAN_LIMITS[effectivePlan(workspace.plan, workspace.plan_status, workspace.trial_ends_at)].minutesPerMonth,
    activeAgents: agents.filter((a) => a.is_active).length,
    totalAgents: agents.length,
    agentsLimit: agentsLimitFor(effectivePlan(workspace.plan, workspace.plan_status, workspace.trial_ends_at)),
    phoneNumbers: phoneCount,
    callsByDay: days.map((date) => ({ date, count: perDay.get(date) ?? 0 })),
    plan: workspace.plan ?? 'free',
    planStatus: workspace.plan_status ?? 'active',
    recentCalls: recent.calls.map((c) => ({
      id: c.id,
      agentName: c.agent_name ?? '–',
      callerNumber: c.caller_number,
      startedAt: c.started_at ?? c.created_at,
      durationSeconds: c.duration_seconds,
      endedReason: c.ended_reason,
      isTest: c.metadata?.source === 'test',
    })),
  }
}
