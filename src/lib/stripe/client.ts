import 'server-only'
import Stripe from 'stripe'

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY)

// Lazy: new Stripe() bez klíče vyhazuje chybu hned při vytvoření.
let client: Stripe | null = null
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY))
}
