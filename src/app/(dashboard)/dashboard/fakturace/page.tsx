import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAdminWorkspace } from '@/lib/auth'
import { isStripeConfigured } from '@/lib/stripe/client'
import { PLAN_BADGE } from '@/lib/plan-badge'
import { isCurrencyLocked, CURRENCY_LOCK_MESSAGE } from '@/lib/billing/currency'
import { formatPrice, getPriceId, PLAN_PRICES, PLANS, type PlanId } from '@/lib/stripe/plans'
import { PlanCards, type PlanCardData } from './plan-cards'

export const metadata = { title: 'Billing' }

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  trialing: { label: 'Trial', variant: 'secondary' },
  past_due: { label: 'Past due', variant: 'destructive' },
  unpaid: { label: 'Unpaid', variant: 'destructive' },
  canceled: { label: 'Canceled', variant: 'outline' },
  incomplete: { label: 'Awaiting payment', variant: 'secondary' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value
  return `${get('day')}.${get('month')}.${get('year')}`
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const workspace = await getAdminWorkspace()
  if (!workspace) redirect('/onboarding')
  const { success } = await searchParams

  const plan = workspace.plan as PlanId
  const status = STATUS[workspace.plan_status] ?? { label: workspace.plan_status, variant: 'outline' as const }

  // Skončené období (např. plán Zdarma) se zobrazuje jako vynulované.
  const expired = workspace.billing_period_end && new Date(workspace.billing_period_end) <= new Date()
  const used = expired ? 0 : workspace.minutes_used
  const unlimited = workspace.minutes_limit === -1
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, workspace.minutes_limit)) * 100))

  const currency = workspace.currency ?? 'CZK'
  const paidActive = plan !== 'free' && !!workspace.stripe_subscription_id
  const plans: PlanCardData[] = (Object.keys(PLANS) as PlanId[]).map((id) => ({
    id,
    name: PLANS[id].name,
    priceLabel: PLAN_PRICES[id][currency] === 0 ? 'Free' : `${formatPrice(PLAN_PRICES[id][currency], currency)}/month`,
    features: [...PLANS[id].featuresEn],
    // Cena bez nastaveného price ID nejde objednat.
    purchasable: id !== 'free' && !!getPriceId(id, currency),
  }))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Billing</h1>

      {success === 'true' && (
        <div className="rounded-lg border border-green-600/30 bg-green-600/10 p-4 text-sm">
          Thank you, your payment went through. Activating the plan can take a few seconds; refresh the page if needed.
        </div>
      )}
      {!isStripeConfigured() && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Payments are not set up yet, subscriptions cannot be ordered.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardDescription>Current plan</CardDescription>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Badge variant="outline" className={`border-transparent text-sm ${PLAN_BADGE[plan] ?? PLAN_BADGE.free}`}>
              {PLANS[plan]?.name ?? plan}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {currency}
            </Badge>
            <Badge variant={status.variant}>{status.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="text-sm">
            {unlimited
              ? `${used} minutes used this month (unlimited)`
              : `${used} / ${workspace.minutes_limit} minutes used this month`}
          </div>
          {!unlimited && (
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={percent > 80 ? 'h-full bg-red-500' : 'h-full bg-primary'}
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
          {workspace.billing_period_start && workspace.billing_period_end && (
            <div className="text-sm text-muted-foreground">
              Billing period: {formatDate(workspace.billing_period_start)} –{' '}
              {formatDate(workspace.billing_period_end)}
            </div>
          )}
        </CardContent>
      </Card>

      {isCurrencyLocked(workspace) ? (
        <p className="text-xs text-muted-foreground">Billing currency: {currency}. {CURRENCY_LOCK_MESSAGE}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Billing currency: {currency}. You can change it in Settings → General until you have a subscription.
        </p>
      )}
      {plans.some((p) => p.id !== 'free' && !p.purchasable) && isStripeConfigured() && (
        <p className="text-sm text-yellow-600">Plans in {currency} are not fully set up yet.</p>
      )}

      <PlanCards plans={plans} currentPlan={plan} managePortal={paidActive} />
    </div>
  )
}
