import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlanId, PLAN_LIMITS, type PlanId, type PlanLimits } from './plans'

// Stavy předplatného, ve kterých plán už neplatí (zrušené / nezaplacené) -> platí limity plánu Zdarma.
const INACTIVE_STATUSES = new Set(['canceled', 'unpaid', 'incomplete_expired'])

const DAY_MS = 24 * 60 * 60 * 1000

export const TRIAL_DAYS = 14
/** Plán, jehož funkce a limity platí během zkušební verze. */
export const TRIAL_PLAN: PlanId = 'starter'

export interface PlanInput {
  plan?: string | null
  plan_status?: string | null
  trial_ends_at?: string | null
}

export interface PlanState {
  plan: PlanId
  isTrialing: boolean
  trialDaysLeft: number // zbývající dny (zaokrouhleno nahoru); mimo trial 0
  trialExpired: boolean // trial už byl a skončil, bez placeného plánu
}

/**
 * Efektivní plán workspace:
 * 1) placený plán (platné předplatné nebo plán nastavený adminem) vždy vyhrává,
 * 2) jinak běžící trial = Starter,
 * 3) jinak Zdarma (po trialu: 0 minut, takže hovory se zastaví).
 */
export function planState(w: PlanInput, now = new Date()): PlanState {
  const paid = isPlanId(w.plan) && w.plan !== 'free' && !(w.plan_status && INACTIVE_STATUSES.has(w.plan_status))
  if (paid) return { plan: w.plan as PlanId, isTrialing: false, trialDaysLeft: 0, trialExpired: false }

  const end = w.trial_ends_at ? new Date(w.trial_ends_at) : null
  if (end && end > now) {
    return { plan: TRIAL_PLAN, isTrialing: true, trialDaysLeft: Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY_MS)), trialExpired: false }
  }
  return { plan: 'free', isTrialing: false, trialDaysLeft: 0, trialExpired: end !== null }
}

export const effectivePlan = (plan: string | null | undefined, status: string | null | undefined, trialEndsAt?: string | null): PlanId =>
  planState({ plan, plan_status: status, trial_ends_at: trialEndsAt }).plan

export async function getWorkspacePlan(workspaceId: string): Promise<PlanState & { limits: PlanLimits }> {
  const { data } = await createAdminClient()
    .from('workspaces')
    .select('plan, plan_status, trial_ends_at')
    .eq('id', workspaceId)
    .maybeSingle()
  const state = planState(data ?? {})
  return { ...state, limits: PLAN_LIMITS[state.plan] }
}
