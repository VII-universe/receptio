import 'server-only'
import { requireAdminPage } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Workspace } from '@/types'

// Každá funkce si ověřuje admina sama (defense in depth) a nikdy nevybírá Stripe klíče ani API key hashe.
const WORKSPACE_COLUMNS =
  'id, name, plan, plan_status, stripe_subscription_id, created_at, minutes_used, minutes_limit, industry, currency'

type WorkspaceRow = Pick<
  Workspace,
  'id' | 'name' | 'plan' | 'plan_status' | 'stripe_subscription_id' | 'created_at' | 'minutes_used' | 'minutes_limit' | 'industry' | 'currency'
>

/** Sloupec z tabulky po stránkách (PostgREST vrací max. 1000 řádků); strop 50 000 řádků. */
async function scanColumn(table: 'agents' | 'call_logs', column: 'workspace_id', since?: Date): Promise<string[]> {
  const supabase = createAdminClient()
  const out: string[] = []
  for (let page = 0; page < 50; page++) {
    let q = supabase.from(table).select(column).range(page * 1000, page * 1000 + 999)
    if (since) q = q.gte('created_at', since.toISOString())
    const { data, error } = await q
    if (error) throw error
    const rows = data as unknown as { workspace_id: string }[]
    out.push(...rows.map((r) => r.workspace_id))
    if (rows.length < 1000) break
  }
  return out
}

const countBy = (ids: string[]) => {
  const m = new Map<string, number>()
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1)
  return m
}

/** Začátek dnešního dne v Praze jako UTC instant. */
function startOfTodayPrague(): Date {
  const now = new Date()
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Prague',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  )
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  const offset = wall - Math.floor(now.getTime() / 1000) * 1000 // o kolik je Praha před UTC
  return new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day) - offset)
}

async function countCalls(since: Date): Promise<number> {
  const { count, error } = await createAdminClient()
    .from('call_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since.toISOString())
  if (error) throw error
  return count ?? 0
}

export interface AdminWorkspaceRow extends WorkspaceRow {
  agents: number
  calls: number
}

async function withCounts(rows: WorkspaceRow[]): Promise<AdminWorkspaceRow[]> {
  const [agentIds, callIds] = await Promise.all([scanColumn('agents', 'workspace_id'), scanColumn('call_logs', 'workspace_id')])
  const agents = countBy(agentIds)
  const calls = countBy(callIds)
  return rows.map((w) => ({ ...w, agents: agents.get(w.id) ?? 0, calls: calls.get(w.id) ?? 0 }))
}

export async function getAdminOverview() {
  await requireAdminPage()
  const supabase = createAdminClient()
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

  const [totalRes, activeIds, callsToday, callsMonth, recentRes] = await Promise.all([
    supabase.from('workspaces').select('id', { count: 'exact', head: true }),
    scanColumn('call_logs', 'workspace_id', thirtyDaysAgo),
    countCalls(startOfTodayPrague()),
    countCalls(monthStart),
    supabase.from('workspaces').select(WORKSPACE_COLUMNS).order('created_at', { ascending: false }).limit(10),
  ])
  if (totalRes.error) throw totalRes.error
  if (recentRes.error) throw recentRes.error

  return {
    totalWorkspaces: totalRes.count ?? 0,
    activeWorkspaces: new Set(activeIds).size,
    callsToday,
    callsThisMonth: callsMonth,
    recent: await withCounts(recentRes.data as unknown as WorkspaceRow[]),
  }
}

export async function getAdminWorkspaces(): Promise<AdminWorkspaceRow[]> {
  await requireAdminPage()
  const { data, error } = await createAdminClient()
    .from('workspaces')
    .select(WORKSPACE_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return withCounts(data as unknown as WorkspaceRow[])
}

export async function getAdminWorkspaceDetail(id: string) {
  await requireAdminPage()
  const supabase = createAdminClient()
  const { data: workspace, error } = await supabase.from('workspaces').select(WORKSPACE_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  if (!workspace) return null

  const [agents, calls] = await Promise.all([
    supabase.from('agents').select('id, name, vapi_agent_id, is_active, created_at').eq('workspace_id', id).order('created_at'),
    supabase
      .from('call_logs')
      .select('id, agent_id, caller_number, duration_seconds, ended_reason, started_at, created_at')
      .eq('workspace_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])
  if (agents.error) throw agents.error
  if (calls.error) throw calls.error

  return { workspace: workspace as unknown as WorkspaceRow, agents: agents.data, calls: calls.data }
}
