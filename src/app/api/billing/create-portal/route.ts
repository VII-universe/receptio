import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { appUrl, requireStripe } from '@/lib/billing/guards'
import { getStripe } from '@/lib/stripe/client'

// POST /api/billing/create-portal – správa předplatného ve Stripe Customer Portal
export async function POST() {
  const unavailable = requireStripe()
  if (unavailable) return unavailable
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response

  const customerId = ctx.workspace.stripe_customer_id
  if (!customerId) {
    return NextResponse.json({ error: 'Zatím nemáte žádné předplatné' }, { status: 409 })
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl()}/dashboard/fakturace`,
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('Stripe: create portal failed', e)
    return NextResponse.json({ error: 'Otevření správy předplatného selhalo' }, { status: 502 })
  }
}
