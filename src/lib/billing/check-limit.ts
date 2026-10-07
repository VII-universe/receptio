import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { teamUsage } from '@/lib/team'
import type { Workspace } from '@/types'
import { effectivePlan, getWorkspacePlan } from './get-workspace-plan'
import { PLAN_LIMITS, type PlanId } from './plans'

export interface LimitCheck {
  allowed: boolean
  current: number
  max: number
  plan: PlanId
}

const result = (current: number, max: number, plan: PlanId): LimitCheck => ({ allowed: current < max, current, max, plan })

async function countRows(table: 'agents' | 'phone_numbers' | 'knowledge_entries', workspaceId: string): Promise<number> {
  const { count, error } = await createAdminClient()
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
  if (error) throw error
  return count ?? 0
}

export async function checkAgentLimit(workspaceId: string): Promise<LimitCheck> {
  const { plan, limits } = await getWorkspacePlan(workspaceId)
  return result(await countRows('agents', workspaceId), limits.agents, plan)
}

export async function checkPhoneNumberLimit(workspaceId: string): Promise<LimitCheck> {
  const { plan, limits } = await getWorkspacePlan(workspaceId)
  return result(await countRows('phone_numbers', workspaceId), limits.phoneNumbers, plan)
}

/** Členové týmu včetně čekajících pozvánek (po přijetí by limit přesáhly). */
export async function checkTeamMemberLimit(workspace: Workspace): Promise<LimitCheck> {
  const plan = effectivePlan(workspace.plan, workspace.plan_status)
  const { members, pending } = await teamUsage(workspace)
  return result(members + pending, PLAN_LIMITS[plan].teamMembers, plan)
}

/** Záznamy znalostní báze napříč agenty workspace (znalosti se zadávají jako textové záznamy, ne soubory). */
export async function checkKnowledgeFileLimit(workspaceId: string): Promise<LimitCheck> {
  const { plan, limits } = await getWorkspacePlan(workspaceId)
  return result(await countRows('knowledge_entries', workspaceId), limits.knowledgeFiles, plan)
}

/** Spotřeba minut v běžícím období; skončené období (např. plán Zdarma) se počítá jako vynulované. */
export async function checkMinutesLimit(workspaceId: string): Promise<LimitCheck & { used: number; paused: boolean }> {
  const { data, error } = await createAdminClient()
    .from('workspaces')
    .select('plan, plan_status, minutes_used, billing_period_end, calls_paused')
    .eq('id', workspaceId)
    .single()
  if (error) throw error
  const plan = effectivePlan(data.plan, data.plan_status)
  const expired = data.billing_period_end && new Date(data.billing_period_end) <= new Date()
  const used = expired ? 0 : data.minutes_used
  const max = PLAN_LIMITS[plan].minutesPerMonth
  return { ...result(used, max, plan), used, paused: data.calls_paused }
}

/** Přičte minuty k měsíční spotřebě workspace (atomicky, viz migrace 005). */
export async function recordMinutesUsed(workspaceId: string, durationSeconds: number): Promise<void> {
  const minutes = Math.ceil(durationSeconds / 60)
  if (minutes <= 0) return
  const { error } = await createAdminClient().rpc('increment_minutes_used', {
    p_workspace_id: workspaceId,
    p_minutes: minutes,
  })
  if (error) throw error
}

/**
 * Srovná workspaces.calls_paused s aktuální spotřebou a limitem (volá se po hovoru, změně plánu i resetu).
 * Vrací, zda právě došlo k pozastavení (přechod false -> true), aby se upozornění poslalo jen jednou.
 */
export async function syncCallsPaused(workspaceId: string): Promise<{ paused: boolean; justPaused: boolean; check: LimitCheck & { used: number } }> {
  const check = await checkMinutesLimit(workspaceId)
  const shouldPause = !check.allowed
  if (shouldPause !== check.paused) {
    const { error } = await createAdminClient().from('workspaces').update({ calls_paused: shouldPause }).eq('id', workspaceId)
    if (error) throw error
  }
  return { paused: shouldPause, justPaused: shouldPause && !check.paused, check }
}
