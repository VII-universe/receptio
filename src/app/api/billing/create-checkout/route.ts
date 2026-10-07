import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { requireWorkspace } from '@/lib/api-auth'
import { appUrl, requireStripe } from '@/lib/billing/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/client'
import { isPaidPlanId, PLANS } from '@/lib/stripe/plans'

// POST /api/billing/create-checkout  Body: { planId: 'starter' | 'business' | 'pro' }
export async function POST(request: Request) {
  const unavailable = requireStripe()
  if (unavailable) return unavailable
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  const { workspace } = ctx

  const body = await request.json().catch(() => null)
  const planId: unknown = body?.planId
  if (!isPaidPlanId(planId)) {
    return NextResponse.json({ error: 'Invalid planId' }, { status: 400 })
  }
  const priceId = PLANS[planId].stripePriceId
  if (!priceId) {
    return NextResponse.json({ error: 'Plán není nakonfigurován' }, { status: 503 })
  }

  // Aktivní předplatné se mění přes portál, jinak by zákazník platil dvakrát.
  if (workspace.stripe_subscription_id && workspace.plan !== 'free') {
    return NextResponse.json(
      { error: 'Už máte aktivní předplatné, změnu proveďte ve správě předplatného' },
      { status: 409 }
    )
  }

  const stripe = getStripe()
  try {
    let customerId = workspace.stripe_customer_id
    if (!customerId) {
      const { userId } = await auth()
      // Idempotency key brání vytvoření duplicitního zákazníka při souběžných požadavcích.
      const customer = await stripe.customers.create(
        { name: workspace.name, metadata: { workspaceId: workspace.id, clerkUserId: userId ?? '' } },
        { idempotencyKey: `customer-${workspace.id}` }
      )
      customerId = customer.id
      const { error } = await createAdminClient()
        .from('workspaces')
        .update({ stripe_customer_id: customerId })
        .eq('id', workspace.id)
      if (error) throw error
    }

    const { userId } = await auth()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: workspace.id,
      line_items: [{ price: priceId, quantity: 1 }],
      locale: 'cs',
      success_url: `${appUrl()}/dashboard/fakturace?success=true`,
      cancel_url: `${appUrl()}/dashboard/fakturace`,
      metadata: { workspaceId: workspace.id, clerkUserId: userId ?? '' },
      subscription_data: { metadata: { workspaceId: workspace.id } },
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('Stripe: create checkout failed', e)
    return NextResponse.json({ error: 'Vytvoření platby selhalo' }, { status: 502 })
  }
}
