import { identifyPrice, type PaidPlanId, type Currency } from './plans'

// Mapování Stripe Price ID -> plán. ID cen se čtou z proměnných prostředí, které v projektu už jsou
// (STRIPE_PRICE_STARTER/BUSINESS/PRO pro CZK a STRIPE_PRICE_*_EUR pro EUR, viz stripe/plans.ts); nové názvy se nezavádějí.

/** Plán odpovídající ceně ze Stripe; null, pokud cena není žádná z našich plánů. */
export function getPlanFromPriceId(priceId: string | undefined | null): PaidPlanId | null {
  return identifyPrice(priceId ?? undefined)?.plan ?? null
}

/** Plán i měna ceny (pro kontrolu, že předplatné odpovídá měně workspace). */
export function getPlanAndCurrencyFromPriceId(priceId: string | undefined | null): { plan: PaidPlanId; currency: Currency } | null {
  return identifyPrice(priceId ?? undefined)
}
