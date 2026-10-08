'use server'

import { revalidatePath } from 'next/cache'
import { buildDemoBookings, buildDemoCalls } from '@/lib/admin/demo-data'
import { logAdminAction } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/auth/require-admin'
import { syncCallsPaused } from '@/lib/billing/check-limit'
import { isPlanId, type PlanId } from '@/lib/billing/plans'
import { PLANS } from '@/lib/stripe/plans'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'

// Server actions jsou veřejné POST endpointy: každá si sama ověří admina (requireAdmin) a vstupy.

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_TRIAL_EXTENSION_DAYS = 90

async function loadWorkspace(id: string) {
  if (!isUuid(id)) throw new Error('Invalid workspace ID')
  const { data, error } = await createAdminClient()
    .from('workspaces')
    .select('id, plan, minutes_limit, minutes_used, overage_minutes_reported, calls_paused, trial_ends_at, trial_used')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Workspace not found')
  return data
}

const done = (id: string) => revalidatePath(`/dashboard/admin/workspaces/${id}`)

/** Ruční změna plánu pro support. Stripe předplatné se nemění (webhook ze Stripe plán později přepíše). */
export async function adminSetPlan(workspaceId: string, plan: PlanId) {
  const adminUserId = await requireAdmin()
  if (!isPlanId(plan)) throw new Error('Invalid plan')
  const before = await loadWorkspace(workspaceId)

  const minutesLimit = PLANS[plan].minutesLimit
  const { error } = await createAdminClient().from('workspaces').update({ plan, minutes_limit: minutesLimit }).eq('id', workspaceId)
  if (error) throw error
  await syncCallsPaused(workspaceId).catch((e) => console.error('Admin: failed to sync calls_paused', e))

  await logAdminAction({
    adminUserId,
    workspaceId,
    action: 'set_plan',
    oldValue: { plan: before.plan, minutes_limit: before.minutes_limit },
    newValue: { plan, minutes_limit: minutesLimit },
  })
  done(workspaceId)
}

/** Vynuluje spotřebu minut (a počitadlo minut nahlášených jako overage) v běžícím období. */
export async function adminResetMinutes(workspaceId: string) {
  const adminUserId = await requireAdmin()
  const before = await loadWorkspace(workspaceId)

  const { error } = await createAdminClient()
    .from('workspaces')
    .update({ minutes_used: 0, overage_minutes_reported: 0, minutes_reset_at: new Date().toISOString() })
    .eq('id', workspaceId)
  if (error) throw error
  await syncCallsPaused(workspaceId).catch((e) => console.error('Admin: failed to sync calls_paused', e))

  await logAdminAction({
    adminUserId,
    workspaceId,
    action: 'reset_minutes',
    oldValue: { minutes_used: before.minutes_used, overage_minutes_reported: before.overage_minutes_reported },
    newValue: { minutes_used: 0, overage_minutes_reported: 0 },
  })
  done(workspaceId)
}

/**
 * Přepne calls_paused. Pozor: příznak se znovu srovná s limity plánu při dalším hovoru, změně plánu nebo resetu
 * (viz syncCallsPaused), ruční pozastavení tedy není trvalé.
 */
export async function adminToggleCallsPaused(workspaceId: string) {
  const adminUserId = await requireAdmin()
  const before = await loadWorkspace(workspaceId)

  const next = !before.calls_paused
  const { error } = await createAdminClient().from('workspaces').update({ calls_paused: next }).eq('id', workspaceId)
  if (error) throw error

  await logAdminAction({
    adminUserId,
    workspaceId,
    action: 'toggle_calls_paused',
    oldValue: { calls_paused: before.calls_paused },
    newValue: { calls_paused: next },
  })
  done(workspaceId)
}

/** Prodlouží trial o N dní (od konce běžícího trialu, jinak od teď) a znovu povolí upozornění na jeho konec. */
export async function adminExtendTrial(workspaceId: string, days: number) {
  const adminUserId = await requireAdmin()
  if (!Number.isInteger(days) || days < 1 || days > MAX_TRIAL_EXTENSION_DAYS) {
    throw new Error(`Days must be a whole number between 1 and ${MAX_TRIAL_EXTENSION_DAYS}`)
  }
  const before = await loadWorkspace(workspaceId)

  const currentEnd = before.trial_ends_at ? new Date(before.trial_ends_at).getTime() : 0
  const newEnd = new Date(Math.max(Date.now(), currentEnd) + days * DAY_MS).toISOString()
  const { error } = await createAdminClient()
    .from('workspaces')
    .update({ trial_ends_at: newEnd, trial_used: true, trial_reminder_sent_at: null })
    .eq('id', workspaceId)
  if (error) throw error
  await syncCallsPaused(workspaceId).catch((e) => console.error('Admin: failed to sync calls_paused', e))

  await logAdminAction({
    adminUserId,
    workspaceId,
    action: 'extend_trial',
    oldValue: { trial_ends_at: before.trial_ends_at },
    newValue: { trial_ends_at: newEnd, days },
  })
  done(workspaceId)
}

/** Počet demo hovorů workspace (call_logs s metadata.demo = true). */
export async function countDemoCalls(workspaceId: string): Promise<number> {
  const { count, error } = await createAdminClient()
    .from('call_logs')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .contains('metadata', { demo: true })
  if (error) throw error
  return count ?? 0
}

/**
 * Zapne / vypne demo data: vloží ukázkové hovory k prvnímu agentovi workspace, nebo je smaže.
 * Demo hovory se nepočítají do spotřeby minut ani do fakturace.
 */
export async function adminToggleDemoData(workspaceId: string) {
  const adminUserId = await requireAdmin()
  if (!isUuid(workspaceId)) throw new Error('Invalid workspace ID')
  const supabase = createAdminClient()
  const before = await countDemoCalls(workspaceId)

  if (before > 0) {
    // Nejdřív rezervace (odkazují na hovory), pak hovory. Skutečné rezervace nemají external_id 'demo:…'.
    const b = await supabase.from('bookings').delete().eq('workspace_id', workspaceId).like('external_id', 'demo:%')
    if (b.error) console.error('Failed to delete demo bookings (is migration 030 applied?)', b.error)
    const { error } = await supabase.from('call_logs').delete().eq('workspace_id', workspaceId).contains('metadata', { demo: true })
    if (error) throw error
  } else {
    const [{ data: ws, error: wsError }, { data: agent, error: agentError }] = await Promise.all([
      supabase.from('workspaces').select('locale, timezone').eq('id', workspaceId).maybeSingle(),
      supabase.from('agents').select('id').eq('workspace_id', workspaceId).order('is_active', { ascending: false }).order('created_at').limit(1).maybeSingle(),
    ])
    if (wsError) throw wsError
    if (agentError) throw agentError
    if (!ws) throw new Error('Workspace not found')
    if (!agent) throw new Error('Workspace has no agent yet – demo calls need an agent to belong to')
    const locale = ws.locale ?? 'en'
    const { data: calls, error } = await supabase.from('call_logs').insert(buildDemoCalls(workspaceId, agent.id, locale)).select('id, started_at, metadata')
    if (error) throw error
    // Rezervace jsou volitelné: bez migrace 030 se vloží jen hovory.
    const bookings = await supabase.from('bookings').insert(buildDemoBookings(workspaceId, agent.id, locale, calls ?? [], ws.timezone ?? 'Europe/Prague'))
    if (bookings.error) console.error('Failed to insert demo bookings (is migration 030 applied?)', bookings.error)
  }

  const after = before > 0 ? 0 : await countDemoCalls(workspaceId)
  await logAdminAction({
    adminUserId,
    workspaceId,
    action: 'toggle_demo_data',
    oldValue: { demo_calls: before },
    newValue: { demo_calls: after },
  })
  done(workspaceId)
}
