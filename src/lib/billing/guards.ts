import 'server-only'
import { NextResponse } from 'next/server'
import { isStripeConfigured } from '@/lib/stripe/client'

/** Stripe je volitelná integrace – bez klíče vrací routes 503. */
export function requireStripe(): NextResponse | null {
  return isStripeConfigured()
    ? null
    : NextResponse.json({ error: 'Payments are not configured' }, { status: 503 })
}

export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
