// Ceník pro veřejný web. Neopisuje čísla: odvozuje je ze stejných zdrojů, ze kterých účtuje Stripe
// (PLAN_PRICES) a vynucují se limity (PLAN_LIMITS, OVERAGE_RATE). Navíc jsou tu jen marketingové údaje.

import { OVERAGE_RATE, PLAN_LIMITS } from '@/lib/billing/plans'
import { PAID_PLAN_IDS, PLAN_PRICES, PLANS, type Currency, type PaidPlanId } from '@/lib/stripe/plans'

export type { Currency, PaidPlanId }
export { CURRENCIES } from '@/lib/stripe/plans'

/** Délka zkušební doby bez karty (stejná hodnota je v podmínkách a v e-mailech). */
export const TRIAL_DAYS = 14

/** Plán zvýrazněný v ceníku. Doporučení, ne tvrzení o oblíbenosti. */
export const RECOMMENDED_PLAN: PaidPlanId = 'business'

/**
 * Typ notifikací, který ceník uvádí. SMS se dnes posílá všem plánům (není vynucená podle plánu),
 * proto ji uvádíme jen u plánů, kde platí i po jejím případném omezení.
 */
const NOTIFICATIONS: Record<PaidPlanId, 'email' | 'emailSms'> = { starter: 'email', business: 'emailSms', pro: 'emailSms' }

/** Výhody navíc, které nejsou limitem (texty v překladech marketing.pricing.extras). */
const EXTRAS: Record<PaidPlanId, string[]> = { starter: [], business: [], pro: ['prioritySupport'] }

export interface MarketingPlan {
  id: PaidPlanId
  name: string
  price: Record<Currency, number>
  minutes: number
  agents: number
  phoneNumbers: number
  teamMembers: number
  notifications: 'email' | 'emailSms'
  extras: string[]
  recommended: boolean
}

export const MARKETING_PLANS: MarketingPlan[] = PAID_PLAN_IDS.map((id) => ({
  id,
  name: PLANS[id].name,
  price: { CZK: PLAN_PRICES[id].CZK, EUR: PLAN_PRICES[id].EUR },
  minutes: PLAN_LIMITS[id].minutesPerMonth,
  agents: PLAN_LIMITS[id].agents,
  phoneNumbers: PLAN_LIMITS[id].phoneNumbers,
  teamMembers: PLAN_LIMITS[id].teamMembers,
  notifications: NOTIFICATIONS[id],
  extras: EXTRAS[id],
  recommended: id === RECOMMENDED_PLAN,
}))

export const OVERAGE = OVERAGE_RATE

/** Výchozí měna podle jazyka webu (čeština platí v Kč, ostatní v eurech). */
export const defaultCurrency = (locale: string): Currency => (locale === 'cs' ? 'CZK' : 'EUR')

/** Částka v měně a jazyce stránky; desetinná místa jen tam, kde je částka má (0,15 €). */
export function formatMoney(amount: number, currency: Currency, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}
