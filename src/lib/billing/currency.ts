import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Currency } from '@/lib/stripe/plans'
import type { Workspace } from '@/types'

export const CURRENCY_LOCK_MESSAGE = 'The currency can only be changed by cancelling and starting a new subscription.'

/** Měnu nelze měnit, dokud má workspace placené předplatné (ceny ve Stripe jsou vázané na měnu). */
export const isCurrencyLocked = (w: Pick<Workspace, 'plan' | 'stripe_subscription_id'>) =>
  (w.plan ?? 'free') !== 'free' || !!w.stripe_subscription_id

/**
 * Změní měnu workspace, pokud nemá aktivní předplatné. Stripe zákazník je navždy svázaný s měnou
 * prvního předplatného, proto se vazba na něj zruší a při dalším checkoutu se vytvoří nový zákazník.
 * (Dřívější faktury zůstávají u původního zákazníka ve Stripe.)
 */
export async function changeWorkspaceCurrency(
  workspace: Pick<Workspace, 'id' | 'plan' | 'stripe_subscription_id' | 'currency'>,
  currency: Currency
): Promise<{ ok: true } | { ok: false; error: string }> {
  if ((workspace.currency ?? 'CZK') === currency) return { ok: true }
  if (isCurrencyLocked(workspace)) return { ok: false, error: CURRENCY_LOCK_MESSAGE }

  const { error } = await createAdminClient()
    .from('workspaces')
    .update({ currency, stripe_customer_id: null })
    .eq('id', workspace.id)
    // pojistka proti souběhu s dokončeným checkoutem: měnit smíme jen workspace bez předplatného
    .is('stripe_subscription_id', null)
  if (error) {
    console.error('Failed to change workspace currency', error)
    return { ok: false, error: 'Changing the currency failed.' }
  }
  return { ok: true }
}
