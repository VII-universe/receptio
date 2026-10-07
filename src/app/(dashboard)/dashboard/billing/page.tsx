import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAdminWorkspace } from '@/lib/auth'
import { isStripeConfigured } from '@/lib/stripe/client'
import { PLAN_BADGE } from '@/lib/plan-badge'
import { isCurrencyLocked } from '@/lib/billing/currency'
import { formatPrice, getPriceId, PLAN_PRICES, PLANS, type PlanId } from '@/lib/stripe/plans'
import { PlanCards, type PlanCardData } from './plan-cards'

export async function generateMetadata() {
  return { title: (await getTranslations('nav'))('billing') }
}

const STATUS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  trialing: 'secondary',
  past_due: 'destructive',
  unpaid: 'destructive',
  canceled: 'outline',
  incomplete: 'secondary',
}

function formatDate(iso: string, locale: string) {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat(locale, {
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
  const t = await getTranslations('billing')
  const tn = await getTranslations('nav')
  const tp = await getTranslations('landing.pricing')
  const locale = await getLocale()
  const workspace = await getAdminWorkspace()
  if (!workspace) redirect('/onboarding')
  const { success } = await searchParams

  const plan = workspace.plan as PlanId
  const statusVariant = STATUS[workspace.plan_status] ?? 'outline'
  const statusLabel = workspace.plan_status in STATUS ? t(`status.${workspace.plan_status}`) : workspace.plan_status

  // Skončené období (např. plán Zdarma) se zobrazuje jako vynulované.
  const expired = workspace.billing_period_end && new Date(workspace.billing_period_end) <= new Date()
  const used = expired ? 0 : workspace.minutes_used
  const unlimited = workspace.minutes_limit === -1
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, workspace.minutes_limit)) * 100))

  const currency = workspace.currency ?? 'CZK'
  const paidActive = plan !== 'free' && !!workspace.stripe_subscription_id
  const plans: PlanCardData[] = (Object.keys(PLANS) as PlanId[]).map((id) => ({
    id,
    name: tp(`${id}.name`),
    priceLabel:
      PLAN_PRICES[id][currency] === 0 ? t('free') : t('perMonth', { price: formatPrice(PLAN_PRICES[id][currency], currency) }),
    features: tp.raw(`${id}.features`) as string[],
    // Cena bez nastaveného price ID nejde objednat.
    purchasable: id !== 'free' && !!getPriceId(id, currency),
  }))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{tn('billing')}</h1>

      {success === 'true' && (
        <div className="rounded-lg border border-green-600/30 bg-green-600/10 p-4 text-sm">
          {t('paymentOk')}
        </div>
      )}
      {!isStripeConfigured() && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          {t('paymentsNotSet')}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardDescription>{t('currentPlan')}</CardDescription>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Badge variant="outline" className={`border-transparent text-sm ${PLAN_BADGE[plan] ?? PLAN_BADGE.free}`}>
              {PLANS[plan] ? tp(`${plan}.name`) : plan}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {currency}
            </Badge>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="text-sm">
            {unlimited
              ? t('minutesUnlimited', { used })
              : t('minutesUsed', { used, limit: workspace.minutes_limit })}
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
              {t('period', { from: formatDate(workspace.billing_period_start, locale), to: formatDate(workspace.billing_period_end, locale) })}
            </div>
          )}
        </CardContent>
      </Card>

      {isCurrencyLocked(workspace) ? (
        <p className="text-xs text-muted-foreground">{t('currencyLine', { currency })} {t('currencyLocked')}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t('currencyLine', { currency })} {t('currencyChange')}
        </p>
      )}
      {plans.some((p) => p.id !== 'free' && !p.purchasable) && isStripeConfigured() && (
        <p className="text-sm text-yellow-600">{t('notFullySetUp', { currency })}</p>
      )}

      <PlanCards plans={plans} currentPlan={plan} managePortal={paidActive} />
    </div>
  )
}
