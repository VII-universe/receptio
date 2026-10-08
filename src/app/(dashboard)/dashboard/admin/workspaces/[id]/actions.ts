'use server'

import { revalidatePath } from 'next/cache'
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
