import 'server-only'
import { getStripe, isStripeConfigured } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { planState } from './get-workspace-plan'
import { PLAN_LIMITS } from './plans'

/** ID metered ceny minut nad limit pro měnu (viz docs/stripe-setup.md); null = overage není nastavený. */
export function getOveragePriceId(currency: 'CZK' | 'EUR'): string | null {
  return (currency === 'EUR' ? process.env.STRIPE_OVERAGE_PRICE_ID_EUR : process.env.STRIPE_OVERAGE_PRICE_ID_CZK) || null
}

/** Název události měřiče (Billing Meter) ve Stripe, do kterého se minuty hlásí. */
export const overageMeterEventName = () => process.env.STRIPE_OVERAGE_METER_EVENT_NAME || 'receptio_overage_minutes'

/** Najde položku předplatného s overage cenou (v kterékoli měně). */
export function findOverageItemId(items: { id: string; price: { id: string } }[]): string | null {
  const ids = [getOveragePriceId('EUR'), getOveragePriceId('CZK')].filter((x): x is string => !!x)
  return items.find((i) => ids.includes(i.price.id))?.id ?? null
}

const MAX_ATTEMPTS = 3

/**
 * Nahlásí do Stripe minuty nad limit plánu, které tam ještě nejsou (jen přírůstek od posledního hlášení).
 * Stripe už nemá usage records (createUsageRecord), minuty se posílají jako události měřiče; deterministický
 * `identifier` zajišťuje, že opakované odeslání téhož přírůstku se nezapočítá dvakrát.
 * Počitadlo overage_minutes_reported se nejdřív podmíněně zabere (ochrana proti souběžným hovorům) a při selhání
 * odeslání se vrátí, takže další hovor přírůstek nahlásí.
 */
export async function reportOverage(workspaceId: string): Promise<{ reported: number }> {
  if (!isStripeConfigured()) return { reported: 0 }
  const supabase = createAdminClient()

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { data: ws, error } = await supabase
      .from('workspaces')
      .select('plan, plan_status, trial_ends_at, minutes_used, billing_period_end, stripe_customer_id, overage_subscription_item_id, overage_minutes_reported')
      .eq('id', workspaceId)
      .single()
    if (error) throw error
    if (!ws.overage_subscription_item_id || !ws.stripe_customer_id) return { reported: 0 }

    const expired = ws.billing_period_end && new Date(ws.billing_period_end) <= new Date()
    const used = expired ? 0 : ws.minutes_used
    const overage = Math.max(0, used - PLAN_LIMITS[planState(ws).plan].minutesPerMonth)
    const alreadyReported = ws.overage_minutes_reported

    if (overage < alreadyReported) {
      // Počitadlo minut se vynulovalo dřív než to naše (nové období): jen srovnat, nic se neúčtuje.
      await supabase.from('workspaces').update({ overage_minutes_reported: overage }).eq('id', workspaceId).eq('overage_minutes_reported', alreadyReported)
      return { reported: 0 }
    }
    const delta = overage - alreadyReported
    if (delta === 0) return { reported: 0 }

    const { data: claimed, error: claimError } = await supabase
      .from('workspaces')
      .update({ overage_minutes_reported: overage })
      .eq('id', workspaceId)
      .eq('overage_minutes_reported', alreadyReported)
      .select('id')
    if (claimError) throw claimError
    if (!claimed?.length) continue // souběžný hovor mezitím nahlásil; přepočítat

    try {
      await getStripe().billing.meterEvents.create({
        event_name: overageMeterEventName(),
        payload: { stripe_customer_id: ws.stripe_customer_id, value: String(delta) },
        identifier: `overage-${workspaceId}-${alreadyReported}-${overage}`,
      })
      return { reported: delta }
    } catch (e) {
      await supabase.from('workspaces').update({ overage_minutes_reported: alreadyReported }).eq('id', workspaceId).eq('overage_minutes_reported', overage)
      throw e
    }
  }
  return { reported: 0 }
}
