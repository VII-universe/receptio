import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { appUrl, requireStripe } from '@/lib/billing/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/client'
import { getPriceId, isPaidPlanId, PLAN_PRICES } from '@/lib/stripe/plans'

// Ověření ceny ve Stripe se pamatuje (ceny jsou neměnné), aby se nevolalo při každém checkoutu.
const verifiedPrices = new Set<string>()

async function priceMismatch(
  stripe: ReturnType<typeof getStripe>,
  priceId: string,
  expectedAmount: number,
  currency: string
): Promise<string | null> {
  const key = `${priceId}:${expectedAmount}:${currency}`
  if (verifiedPrices.has(key)) return null
  const price = await stripe.prices.retrieve(priceId)
  const problems: string[] = []
  if (!price.active) problems.push('inactive')
  if (price.currency !== currency.toLowerCase()) problems.push(`currency ${price.currency}`)
  if (price.unit_amount !== expectedAmount * 100) problems.push(`amount ${price.unit_amount}`)
  if (price.recurring?.interval !== 'month') problems.push('not monthly')
  if (problems.length > 0) return problems.join(', ')
  verifiedPrices.add(key)
  return null
}

// POST /api/billing/create-checkout  Body: { planId: 'starter' | 'business' | 'pro' }
export async function POST(request: Request) {
  const unavailable = requireStripe()
  if (unavailable) return unavailable
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { workspace } = ctx

  const body = await request.json().catch(() => null)
  const planId: unknown = body?.planId
  if (!isPaidPlanId(planId)) {
    return NextResponse.json({ error: 'Invalid planId' }, { status: 400 })
  }
  const currency = workspace.currency ?? 'CZK'
  const priceId = getPriceId(planId, currency)
  if (!priceId) {
    return NextResponse.json({ error: `Plán v měně ${currency} není nakonfigurován` }, { status: 503 })
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
    // Zákazník nesmí zaplatit jinou částku, než kolik viděl v ceníku.
    const mismatch = await priceMismatch(stripe, priceId, PLAN_PRICES[planId][currency], currency)
    if (mismatch) {
      console.error(`Stripe: price ${priceId} does not match the price list (${mismatch})`)
      return NextResponse.json({ error: 'Cena plánu ve Stripe neodpovídá ceníku. Kontaktujte podporu.' }, { status: 502 })
    }

    let customerId = workspace.stripe_customer_id
    if (!customerId) {
      const { userId } = await auth()
      // Idempotency key brání vytvoření duplicitního zákazníka při souběžných požadavcích.
      const customer = await stripe.customers.create(
        { name: workspace.name, metadata: { workspaceId: workspace.id, clerkUserId: userId ?? '' } },
        { idempotencyKey: `customer-${workspace.id}-${currency}` } // zákazník je ve Stripe vázaný na měnu
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
