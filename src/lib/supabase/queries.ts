import 'server-only'
import { cache } from 'react'
import { createAdminClient } from './admin'
import type {
  Agent,
  CallLog,
  Industry,
  IndustryTemplate,
  Subscription,
  Workspace,
} from '@/types'

// cache(): layout i stránka v jednom requestu sdílejí jeden dotaz.
export const getWorkspaceByClerkUserId = cache(async (clerkUserId: string): Promise<Workspace | null> => {
  const { data, error } = await createAdminClient()
    .from('workspaces')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()
  if (error) throw error
  return data as Workspace | null
})

export const getWorkspaceByClerkOrgId = cache(async (clerkOrgId: string): Promise<Workspace | null> => {
  const { data, error } = await createAdminClient()
    .from('workspaces')
    .select('*')
    .eq('clerk_org_id', clerkOrgId)
    .maybeSingle()
  if (error) throw error
  return data as Workspace | null
})

export async function getAgentByWorkspaceId(workspaceId: string): Promise<Agent | null> {
  const { data, error } = await createAdminClient()
    .from('agents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as Agent | null
}

export async function getAgentsByWorkspaceId(workspaceId: string): Promise<Agent[]> {
  const { data, error } = await createAdminClient()
    .from('agents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Agent[]
}

export async function getAgentById(workspaceId: string, id: string): Promise<Agent | null> {
  if (!isUuid(id)) return null
  const { data, error } = await createAdminClient()
    .from('agents')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (error) throw error
  return data as Agent | null
}

export async function getCallLogs(workspaceId: string, limit = 50): Promise<CallLog[] | null> {
  const { data, error } = await createAdminClient()
    .from('call_logs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as CallLog[]
}

export async function getSubscription(workspaceId: string): Promise<Subscription | null> {
  const { data, error } = await createAdminClient()
    .from('subscriptions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (error) throw error
  return data as Subscription | null
}

export async function getIndustryTemplates(
  industry: Industry,
  language = 'cs'
): Promise<IndustryTemplate[] | null> {
  const { data, error } = await createAdminClient()
    .from('industry_templates')
    .select('*')
    .eq('industry', industry)
    .eq('language', language)
    .order('is_default', { ascending: false })
  if (error) throw error
  return data as IndustryTemplate[]
}

/** Sloupce pro seznam hovorů (bez těžkého přepisu); agent se připojí JOINem. */
const CALL_LIST_COLUMNS =
  'id, agent_id, workspace_id, vapi_call_id, caller_number, duration_seconds, status, summary, recording_url, cost, cost_cents, ended_reason, metadata, started_at, ended_at, created_at, agent:agents(name)'

export type CallListItem = Omit<CallLog, 'transcript' | 'transcript_json'> & { agent_name: string | null }

type CallRow = Record<string, unknown> & { agent?: { name: string } | null }
const withAgentName = <T,>(row: CallRow): T => {
  const { agent, ...rest } = row
  return { ...rest, agent_name: agent?.name ?? null } as T
}

export async function getCallLogsPage(
  workspaceId: string,
  opts: { page?: number; limit?: number; agentId?: string } = {}
): Promise<{ calls: CallListItem[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1)
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20))
  const from = (page - 1) * limit

  let query = createAdminClient()
    .from('call_logs')
    .select(CALL_LIST_COLUMNS, { count: 'exact' })
    .eq('workspace_id', workspaceId)
    // created_at vzniká při začátku hovoru; started_at mají jen hovory po migraci 008
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)
  if (opts.agentId) query = query.eq('agent_id', opts.agentId)

  const { data, error, count } = await query
  if (error) throw error
  return {
    calls: ((data ?? []) as unknown as CallRow[]).map((r) => withAgentName<CallListItem>(r)),
    total: count ?? 0,
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: string) => UUID.test(v)

/** Jeden hovor včetně přepisu; vrací null, pokud nepatří do workspace. */
export async function getCallLogById(
  workspaceId: string,
  id: string
): Promise<(CallLog & { agent_name: string | null }) | null> {
  if (!isUuid(id)) return null
  const { data, error } = await createAdminClient()
    .from('call_logs')
    .select('*, agent:agents(name)')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (error) throw error
  return data ? withAgentName(data as unknown as CallRow) : null
}

/** Hovory v aktuálním kalendářním měsíci (UTC). */
export async function getMonthlyCallStats(workspaceId: string): Promise<{
  calls: number
  seconds: number
  finishedCalls: number
  completedCalls: number // ukončil zákazník nebo agent
  endedCalls: number // hovory se známým důvodem ukončení
}> {
  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)

  const { data, error } = await createAdminClient()
    .from('call_logs')
    .select('duration_seconds, ended_reason')
    .eq('workspace_id', workspaceId)
    .gte('created_at', start.toISOString())
  if (error) throw error

  const rows = data ?? []
  return {
    calls: rows.length,
    seconds: rows.reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0),
    finishedCalls: rows.filter((r) => (r.duration_seconds ?? 0) > 0).length,
    completedCalls: rows.filter(
      (r) => r.ended_reason === 'customer-ended-call' || r.ended_reason === 'assistant-ended-call'
    ).length,
    endedCalls: rows.filter((r) => r.ended_reason != null).length,
  }
}
