/**
 * Jednorázový skript: vytvoří konfiguraci Stripe Customer Portal (změna plánu, zrušení ke konci období,
 * změna karty, faktury) a vypíše její ID.
 *
 *   npx tsx src/lib/stripe/configure-portal.ts
 *
 * Čte STRIPE_SECRET_KEY a ID cen (STRIPE_PRICE_*, STRIPE_PRICE_*_EUR, STRIPE_OVERAGE_PRICE_ID_*) z prostředí / .env.local.
 * Výstup STRIPE_PORTAL_CONFIGURATION_ID=bpc_… dej do .env.local a Vercelu.
 */
import Stripe from 'stripe'

try {
  process.loadEnvFile('.env.local')
} catch {
  /* proměnné můžou být už v prostředí */
}

const PRICE_ENV = [
  'STRIPE_PRICE_STARTER',
  'STRIPE_PRICE_BUSINESS',
  'STRIPE_PRICE_PRO',
  'STRIPE_PRICE_STARTER_EUR',
  'STRIPE_PRICE_BUSINESS_EUR',
  'STRIPE_PRICE_PRO_EUR',
  // Předplatné obsahuje i metered položku s minutami navíc; portál ji musí znát, jinak by změna plánu selhala.
  'STRIPE_OVERAGE_PRICE_ID_EUR',
  'STRIPE_OVERAGE_PRICE_ID_CZK',
] as const

async function main() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  const stripe = new Stripe(key)

  // Portál potřebuje seznam produktů a cen, mezi kterými smí zákazník přepínat.
  const byProduct = new Map<string, Set<string>>()
  for (const name of PRICE_ENV) {
    const id = process.env[name]
    if (!id) {
      console.warn(`Skipping ${name} (not set)`)
      continue
    }
    const price = await stripe.prices.retrieve(id)
    const product = typeof price.product === 'string' ? price.product : price.product.id
    byProduct.set(product, (byProduct.get(product) ?? new Set()).add(price.id))
  }
  if (byProduct.size === 0) throw new Error('No Stripe price IDs found in the environment')

  const config = await stripe.billingPortal.configurations.create({
    business_profile: { headline: 'Receptio — správa předplatného' },
    features: {
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price'],
        proration_behavior: 'create_prorations',
        products: [...byProduct].map(([product, prices]) => ({ product, prices: [...prices] })),
      },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end', // nezruší hned, ale po konci období
        cancellation_reason: {
          enabled: true,
          options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
        },
      },
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
    },
  })

  console.log(`\nSTRIPE_PORTAL_CONFIGURATION_ID=${config.id}\n`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
