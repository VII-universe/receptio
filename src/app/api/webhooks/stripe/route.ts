import { after, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { syncCallsPaused } from '@/lib/billing/check-limit'
import { sendTrialEmail } from '@/lib/email/send-trial-ending'
import { sendSubscriptionConfirmationEmail } from '@/lib/email/send-subscription-confirmation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured } from '@/lib/stripe/client'
import { PLANS, planFromPriceId } from '@/lib/stripe/plans'

export const dynamic = 'force-dynamic'

const iso = (unix: number | undefined) => (unix ? new Date(unix * 1000).toISOString() : null)

/** Období předplatného žije u položek (od Stripe API 2025-03), ne na samotném subscription. */
function subscriptionPeriod(sub: Stripe.Subscription) {
  const item = sub.items.data[0]
  return { start: iso(item?.current_period_start), end: iso(item?.current_period_end) }
}

/** Po změně plánu/období srovná pozastavení hovorů (např. upgrade hovory obnoví, zrušení na Free je zastaví). */
async function resyncPause(workspaceId: string) {
  try {
    await syncCallsPaused(workspaceId)
  } catch (e) {
    console.error('Stripe: failed to sync calls_paused', workspaceId, e)
  }
}

const customerId = (c: string | Stripe.Customer | Stripe.DeletedCustomer | null) =>
  typeof c === 'string' ? c : (c?.id ?? null)

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || !session.subscription) return
  const workspaceId = session.metadata?.workspaceId ?? session.client_reference_id
  if (!workspaceId) throw new Error(`checkout ${session.id}: missing workspaceId`)

  // Plán a období bereme ze Stripe (autoritativně), ne z metadat.
  const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
  const sub = await getStripe().subscriptions.retrieve(subId)
  const plan = planFromPriceId(sub.items.data[0]?.price.id)
  if (!plan) throw new Error(`checkout ${session.id}: unknown price ${sub.items.data[0]?.price.id}`)
  const period = subscriptionPeriod(sub)

  const supabase = createAdminClient()
  // Potvrzovací e-mail jen při první aktivaci (Stripe může událost doručit opakovaně).
  const { data: before } = await supabase.from('workspaces').select('stripe_subscription_id').eq('id', workspaceId).maybeSingle()
  const firstActivation = before?.stripe_subscription_id !== sub.id

  const { error } = await supabase
    .from('workspaces')
    .update({
      stripe_customer_id: customerId(session.customer),
      stripe_subscription_id: sub.id,
      plan,
      plan_status: sub.status,
      minutes_limit: PLANS[plan].minutesLimit,
      minutes_used: 0,
      billing_period_start: period.start,
      billing_period_end: period.end,
    })
    .eq('id', workspaceId)
  if (error) throw error
  await resyncPause(workspaceId)

  const email = session.customer_details?.email
  if (firstActivation && email) {
    after(() =>
      sendSubscriptionConfirmationEmail({
        email,
        firstName: session.customer_details?.name?.trim().split(/\s+/)[0] ?? '',
        plan,
        currency: session.currency?.toUpperCase() === 'EUR' ? 'EUR' : 'CZK',
        nextBillingDate: period.end,
      }).catch((e) => console.error('Stripe: confirmation email failed', e))
    )
  }
}

async function onSubscriptionUpdated(sub: Stripe.Subscription) {
  const supabase = createAdminClient()
  const cid = customerId(sub.customer)
  if (!cid) return
  const { data: ws, error: findError } = await supabase
    .from('workspaces')
    .select('id, stripe_subscription_id, billing_period_start, plan_status')
    .eq('stripe_customer_id', cid)
    .maybeSingle()
  if (findError) throw findError
  if (!ws) return
  // Událost staršího (už nahrazeného) předplatného nesmí přepsat aktuální.
  if (ws.stripe_subscription_id && ws.stripe_subscription_id !== sub.id) return

  // E-mail "trial skončil" jen při přechodu z trialu do neuhrazeného stavu (běžné neplacení obnovy řeší upomínky Stripe).
  const trialJustEnded = ws.plan_status === 'trialing'
  const period = subscriptionPeriod(sub)
  const update: Record<string, string | number | null> = {
    stripe_subscription_id: sub.id,
    plan_status: sub.status,
    billing_period_start: period.start,
    billing_period_end: period.end,
  }

  const plan = planFromPriceId(sub.items.data[0]?.price.id)
  if (plan) {
    update.plan = plan
    update.minutes_limit = PLANS[plan].minutesLimit
  } else {
    console.error(`Stripe: subscription ${sub.id} has unknown price, plan unchanged`)
  }

  // Nové fakturační období (obnova předplatného) = vynulovat spotřebu minut.
  const newPeriod = period.start && ws.billing_period_start
    ? new Date(period.start).getTime() !== new Date(ws.billing_period_start).getTime()
    : false
  if (newPeriod) update.minutes_used = 0

  const { error } = await supabase.from('workspaces').update(update).eq('id', ws.id)
  if (error) throw error
  await resyncPause(ws.id)

  // Platba po skončení trialu (nebo při obnově) neprošla: hovory se zastaví (past_due ruší checkMinutesLimit) a přijde e-mail.
  if (sub.status === 'past_due' || sub.status === 'unpaid') {
    const { error: pauseError } = await supabase.from('workspaces').update({ calls_paused: true }).eq('id', ws.id).eq('calls_paused', false)
    if (pauseError) throw pauseError
    if (trialJustEnded) await sendTrialEmail({ workspaceId: ws.id, variant: 'ended' }).catch((e) => console.error('Stripe: trial-ended email failed', e))
  }
}

/** Stripe pošle trial_will_end 3 dny před koncem trialu předplatného (karta už je uložená, platba se spustí sama). */
async function onTrialWillEnd(sub: Stripe.Subscription) {
  const cid = customerId(sub.customer)
  if (!cid) return
  const { data: ws, error } = await createAdminClient().from('workspaces').select('id, stripe_subscription_id').eq('stripe_customer_id', cid).maybeSingle()
  if (error) throw error
  if (!ws || (ws.stripe_subscription_id && ws.stripe_subscription_id !== sub.id)) return
  const daysLeft = sub.trial_end ? Math.max(1, Math.ceil((sub.trial_end * 1000 - Date.now()) / 86400000)) : 3
  // Chyba e-mailu nesmí způsobit opakování události.
  await sendTrialEmail({ workspaceId: ws.id, variant: 'ending', daysLeft }).catch((e) => console.error('Stripe: trial-ending email failed', e))
}

async function onSubscriptionDeleted(sub: Stripe.Subscription) {
  // Jen pokud je to aktuální předplatné workspace; zrušení staršího nesmí srazit nové.
  const { data: rows, error } = await createAdminClient()
    .from('workspaces')
    .update({
      plan: 'free',
      plan_status: 'active',
      minutes_limit: PLANS.free.minutesLimit,
      stripe_subscription_id: null,
      billing_period_start: null,
      billing_period_end: null,
    })
    .eq('stripe_subscription_id', sub.id)
    .select('id')
  if (error) throw error
  for (const r of rows ?? []) await resyncPause(r.id)
}

export async function POST(request: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  // Raw body je nutný pro ověření podpisu.
  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutCompleted(event.data.object)
        break
      case 'customer.subscription.updated':
        await onSubscriptionUpdated(event.data.object)
        break
      case 'customer.subscription.trial_will_end':
        await onTrialWillEnd(event.data.object)
        break
      case 'customer.subscription.deleted':
        await onSubscriptionDeleted(event.data.object)
        break
    }
  } catch (e) {
    // 500, aby Stripe událost zopakoval – jinak by zaplacený zákazník zůstal bez plánu.
    console.error(`Stripe webhook: ${event.type} (${event.id}) failed`, e)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
