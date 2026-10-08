import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { appUrl, requireStripe } from '@/lib/billing/guards'
import { getStripe } from '@/lib/stripe/client'

// POST /api/billing/portal – správa předplatného, platební karty a faktur ve Stripe Customer Portal
// (změna plánu, zrušení ke konci období). Konfiguraci portálu vytváří src/lib/stripe/configure-portal.ts.
export async function POST() {
  const unavailable = requireStripe()
  if (unavailable) return unavailable
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response

  const customerId = ctx.workspace.stripe_customer_id
  if (!customerId) {
    return NextResponse.json({ error: 'You do not have a subscription yet' }, { status: 409 })
  }

  try {
    const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl()}/dashboard/billing`,
      ...(configuration ? { configuration } : {}),
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('Stripe: create portal failed', e)
    return NextResponse.json({ error: 'Opening subscription management failed' }, { status: 502 })
  }
}
