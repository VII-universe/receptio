import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlanId, PLAN_LIMITS, type PlanId, type PlanLimits } from './plans'

// Stavy předplatného, ve kterých plán už neplatí (zrušené / nezaplacené) -> platí limity plánu Zdarma.
const INACTIVE_STATUSES = new Set(['canceled', 'unpaid', 'incomplete_expired'])

/** Efektivní plán z uložených dat workspace (webhook ze Stripe drží plan a plan_status aktuální); fallback 'free'. */
export function effectivePlan(plan: string | null | undefined, status: string | null | undefined): PlanId {
  if (!isPlanId(plan)) return 'free'
  return status && INACTIVE_STATUSES.has(status) ? 'free' : plan
}

export async function getWorkspacePlan(workspaceId: string): Promise<{ plan: PlanId; limits: PlanLimits }> {
  const { data } = await createAdminClient().from('workspaces').select('plan, plan_status').eq('id', workspaceId).maybeSingle()
  const plan = effectivePlan(data?.plan, data?.plan_status)
  return { plan, limits: PLAN_LIMITS[plan] }
}
