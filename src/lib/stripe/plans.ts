import { PLAN_LIMITS } from '@/lib/billing/plans'

export const PLANS = {
  free: {
    name: 'Free',
    nameCs: 'Zdarma',
    price: 0,
    minutesLimit: PLAN_LIMITS.free.minutesPerMonth,
    agentsLimit: PLAN_LIMITS.free.agents,
    features: ['14 dní zdarma, bez karty', 'Plný přístup k plánu Starter', 'Bez závazků'], // česky
    featuresEn: ['14 days free, no card', 'Full Starter plan access', 'No commitment'],
    stripePriceId: null,
  },
  starter: {
    name: 'Starter',
    nameCs: 'Starter',
    price: 990,
    minutesLimit: PLAN_LIMITS.starter.minutesPerMonth,
    agentsLimit: PLAN_LIMITS.starter.agents,
    features: ['150 minut/měsíc, poté za minutu', '1 asistent', 'Email notifikace'],
    featuresEn: ['150 minutes/month, then per minute', '1 agent', 'Email notifications'],
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
  },
  business: {
    name: 'Business',
    nameCs: 'Business',
    price: 2490,
    minutesLimit: PLAN_LIMITS.business.minutesPerMonth,
    agentsLimit: PLAN_LIMITS.business.agents,
    features: ['400 minut/měsíc, poté za minutu', '3 asistenti', 'Email + SMS notifikace'],
    featuresEn: ['400 minutes/month, then per minute', '3 agents', 'Email + SMS notifications'],
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS,
  },
  pro: {
    name: 'Pro',
    nameCs: 'Pro',
    price: 4990,
    minutesLimit: PLAN_LIMITS.pro.minutesPerMonth,
    agentsLimit: PLAN_LIMITS.pro.agents,
    features: ['700 minut/měsíc, poté za minutu', '10 asistentů', 'Prioritní podpora'],
    featuresEn: ['700 minutes/month, then per minute', '10 agents', 'Priority support'],
    stripePriceId: process.env.STRIPE_PRICE_PRO,
  },
} as const

export type PlanId = keyof typeof PLANS
export type PaidPlanId = Exclude<PlanId, 'free'>

export const PAID_PLAN_IDS: PaidPlanId[] = ['starter', 'business', 'pro']

export const isPlanId = (v: unknown): v is PlanId => typeof v === 'string' && v in PLANS
export const isPaidPlanId = (v: unknown): v is PaidPlanId =>
  typeof v === 'string' && (PAID_PLAN_IDS as string[]).includes(v)

export type Currency = 'CZK' | 'EUR'
export const CURRENCIES: Currency[] = ['CZK', 'EUR']
export const isCurrency = (v: unknown): v is Currency => v === 'CZK' || v === 'EUR'

/** Ceník podle měny. Částky musí odpovídat cenám (Price) ve Stripe; při checkoutu se to ověřuje. */
export const PLAN_PRICES = {
  free: { CZK: 0, EUR: 0 },
  starter: { CZK: 990, EUR: 39 },
  business: { CZK: 2490, EUR: 99 },
  pro: { CZK: 4990, EUR: 199 },
} as const

const PRICE_ENV: Record<Currency, Record<PaidPlanId, string>> = {
  CZK: { starter: 'STRIPE_PRICE_STARTER', business: 'STRIPE_PRICE_BUSINESS', pro: 'STRIPE_PRICE_PRO' },
  EUR: { starter: 'STRIPE_PRICE_STARTER_EUR', business: 'STRIPE_PRICE_BUSINESS_EUR', pro: 'STRIPE_PRICE_PRO_EUR' },
}

/** Stripe price ID pro plán a měnu (null = plán zdarma nebo cena není nastavená). Čte env až při volání. */
export function getPriceId(plan: PlanId, currency: Currency): string | null {
  if (plan === 'free') return null
  return process.env[PRICE_ENV[currency][plan]] || null
}

/** Stripe price ID -> náš plán a měna, v obou měnách (null, pokud cena není žádná z našich). */
export function planFromPriceId(priceId: string | undefined): PaidPlanId | null {
  return identifyPrice(priceId)?.plan ?? null
}

export function identifyPrice(priceId: string | undefined): { plan: PaidPlanId; currency: Currency } | null {
  if (!priceId) return null
  for (const currency of CURRENCIES) {
    const plan = PAID_PLAN_IDS.find((id) => getPriceId(id, currency) === priceId)
    if (plan) return { plan, currency }
  }
  return null
}

export function formatPrice(amount: number, currency: Currency): string {
  if (currency === 'CZK') return `${amount.toLocaleString('cs-CZ')} Kč`
  if (currency === 'EUR') return `€${amount}`
  return `${amount} ${currency}`
}

/** Limit agentů pro plán uložený ve workspace (neznámý plán = Zdarma). */
export function agentsLimitFor(plan: string | undefined): number {
  return (isPlanId(plan) ? PLANS[plan] : PLANS.free).agentsLimit
}

/** Kolik telefonních čísel smí workspace mít (limity v PLAN_LIMITS; plán Zdarma čísla kupovat nemůže). */
export function phoneNumbersLimitFor(plan: string | undefined): number {
  return (isPlanId(plan) ? PLAN_LIMITS[plan] : PLAN_LIMITS.free).phoneNumbers
}

/** Orientační měsíční cena českého čísla v Kč (zobrazuje se v UI, ukládá se do phone_numbers). */
export const PHONE_NUMBER_MONTHLY_COST = 45

/** Kolik členů týmu smí workspace mít (včetně vlastníka); limity v PLAN_LIMITS. */
export function teamLimitFor(plan: string | undefined): number | null {
  return (isPlanId(plan) ? PLAN_LIMITS[plan] : PLAN_LIMITS.free).teamMembers
}
