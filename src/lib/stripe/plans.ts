export const PLANS = {
  free: {
    name: 'Free',
    nameCs: 'Zdarma',
    price: 0,
    minutesLimit: 30,
    agentsLimit: 1,
    features: ['30 minut/měsíc', '1 asistent', 'Základní funkce'],
    stripePriceId: null,
  },
  starter: {
    name: 'Starter',
    nameCs: 'Starter',
    price: 990,
    minutesLimit: 100,
    agentsLimit: 1,
    features: ['100 minut/měsíc', '1 asistent', 'Email notifikace'],
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
  },
  business: {
    name: 'Business',
    nameCs: 'Business',
    price: 2490,
    minutesLimit: 500,
    agentsLimit: 3,
    features: ['500 minut/měsíc', '3 asistenti', 'Email + SMS notifikace'],
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS,
  },
  pro: {
    name: 'Pro',
    nameCs: 'Pro',
    price: 5990,
    minutesLimit: -1, // neomezeno
    agentsLimit: 10,
    features: ['Neomezené minuty', '10 asistentů', 'Prioritní podpora'],
    stripePriceId: process.env.STRIPE_PRICE_PRO,
  },
} as const

export type PlanId = keyof typeof PLANS
export type PaidPlanId = Exclude<PlanId, 'free'>

export const PAID_PLAN_IDS: PaidPlanId[] = ['starter', 'business', 'pro']

export const isPlanId = (v: unknown): v is PlanId => typeof v === 'string' && v in PLANS
export const isPaidPlanId = (v: unknown): v is PaidPlanId =>
  typeof v === 'string' && (PAID_PLAN_IDS as string[]).includes(v)

/** Stripe price ID -> náš plán (null, pokud cena není žádný z plánů). */
export function planFromPriceId(priceId: string | undefined): PaidPlanId | null {
  if (!priceId) return null
  return PAID_PLAN_IDS.find((id) => PLANS[id].stripePriceId === priceId) ?? null
}

/** Limit agentů pro plán uložený ve workspace (neznámý plán = Zdarma). */
export function agentsLimitFor(plan: string | undefined): number {
  return (isPlanId(plan) ? PLANS[plan] : PLANS.free).agentsLimit
}
