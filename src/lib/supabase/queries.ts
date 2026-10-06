import 'server-only'
import { createAdminClient } from './admin'
import type {
  Agent,
  CallLog,
  Industry,
  IndustryTemplate,
  Subscription,
  Workspace,
} from '@/types'

export async function getWorkspaceByClerkUserId(clerkUserId: string): Promise<Workspace | null> {
  const { data, error } = await createAdminClient()
    .from('workspaces')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()
  if (error) throw error
  return data as Workspace | null
}

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

/** Počet hovorů a minut v aktuálním kalendářním měsíci (UTC). */
export async function getMonthlyCallStats(
  workspaceId: string
): Promise<{ calls: number; minutes: number }> {
  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)

  const { data, error } = await createAdminClient()
    .from('call_logs')
    .select('duration_seconds')
    .eq('workspace_id', workspaceId)
    .gte('created_at', start.toISOString())
  if (error) throw error

  const seconds = (data ?? []).reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0)
  return { calls: data?.length ?? 0, minutes: Math.ceil(seconds / 60) }
}
