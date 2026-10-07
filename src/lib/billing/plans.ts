/** Limity plánů: jediný zdroj pravdy pro vynucování (agenti, čísla, minuty, tým, znalosti, historie analytiky). */
export const PLAN_LIMITS = {
  free: {
    agents: 1,
    phoneNumbers: 0,
    minutesPerMonth: 0,
    teamMembers: 1,
    knowledgeFiles: 3,
    analyticsRetentionDays: 7,
  },
  starter: {
    agents: 1,
    phoneNumbers: 1,
    minutesPerMonth: 100,
    teamMembers: 1,
    knowledgeFiles: 10,
    analyticsRetentionDays: 30,
  },
  business: {
    agents: 3,
    phoneNumbers: 3,
    minutesPerMonth: 500,
    teamMembers: 5,
    knowledgeFiles: 50,
    analyticsRetentionDays: 90,
  },
  pro: {
    agents: 10,
    phoneNumbers: 10,
    minutesPerMonth: 2000,
    teamMembers: 20,
    knowledgeFiles: 200,
    analyticsRetentionDays: 365,
  },
} as const

export type PlanId = keyof typeof PLAN_LIMITS
export type PlanLimits = (typeof PLAN_LIMITS)[PlanId]

export const isPlanId = (v: unknown): v is PlanId => typeof v === 'string' && Object.prototype.hasOwnProperty.call(PLAN_LIMITS, v)

/** Plán, který následuje po daném (pro tlačítko upgradu); null u nejvyššího. */
export const NEXT_PLAN: Record<PlanId, PlanId | null> = { free: 'starter', starter: 'business', business: 'pro', pro: null }
