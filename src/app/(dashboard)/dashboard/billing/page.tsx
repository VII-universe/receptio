import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAdminWorkspace } from '@/lib/auth'
import { isStripeConfigured } from '@/lib/stripe/client'
import { PLAN_BADGE } from '@/lib/plan-badge'
import { checkMinutesLimit } from '@/lib/billing/check-limit'
import { effectivePlan, planState } from '@/lib/billing/get-workspace-plan'
import { formatOverageRate } from '@/lib/billing/format-overage'
import { PLAN_LIMITS } from '@/lib/billing/plans'
import { isCurrencyLocked } from '@/lib/billing/currency'
import { formatPrice, getPriceId, PLAN_PRICES, PLANS, type PlanId } from '@/lib/stripe/plans'
import { UsageBar } from '@/components/usage-bar'
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
  const trial = planState(workspace)
  const shownPlan = trial.plan // během trialu Starter
  const statusVariant = trial.isTrialing ? 'secondary' : (STATUS[workspace.plan_status] ?? 'outline')
  const statusLabel = trial.isTrialing
    ? t('trial.badge', { days: trial.trialDaysLeft })
    : workspace.plan_status in STATUS
      ? t(`status.${workspace.plan_status}`)
      : workspace.plan_status

  // Skončené období (např. plán Zdarma) se zobrazuje jako vynulované.
  const expired = workspace.billing_period_end && new Date(workspace.billing_period_end) <= new Date()
  const used = expired ? 0 : workspace.minutes_used
  const minutesMax = PLAN_LIMITS[effectivePlan(workspace.plan, workspace.plan_status, workspace.trial_ends_at)].minutesPerMonth
  const unlimited = false
  const percent = Math.min(100, minutesMax > 0 ? Math.round((used / minutesMax) * 100) : 100)

  const currency = workspace.currency ?? 'CZK'
  const paidActive = plan !== 'free' && !!workspace.stripe_subscription_id
  const mode = paidActive ? 'manage' : trial.isTrialing ? 'trial' : 'choose'
  const cancelAt = workspace.subscription_cancel_at && new Date(workspace.subscription_cancel_at) > new Date() ? workspace.subscription_cancel_at : null
  const overLimits = (await checkMinutesLimit(workspace.id).catch(() => null))?.overLimits ?? false
  const plans: PlanCardData[] = (Object.keys(PLANS) as PlanId[]).map((id) => ({
    id,
    name: tp(`${id}.name`),
    priceLabel:
      PLAN_PRICES[id][currency] === 0 ? t('free') : t('perMonth', { price: formatPrice(PLAN_PRICES[id][currency], currency) }),
    features: [
      ...(id === 'free' ? [] : [tp('minutesLine', { count: PLAN_LIMITS[id].minutesPerMonth, price: formatOverageRate(locale, currency) })]),
      ...(tp.raw(`${id}.features`) as string[]),
    ],
    // Cena bez nastaveného price ID nejde objednat.
    purchasable: id !== 'free' && !!getPriceId(id, currency),
  }))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="app-title text-2xl font-semibold tracking-tight">{tn('billing')}</h1>

      {success === 'true' && (
        <div className="rounded-lg border border-green-600/30 bg-green-600/10 p-4 text-sm">
          {t('paymentOk')}
        </div>
      )}
      {cancelAt && paidActive && (
        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm">
          {t('cancelledNotice', { date: formatDate(cancelAt, locale) })}
        </div>
      )}
      {overLimits && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
          {t('downgradedNotice')}
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
            <Badge variant="outline" className={`border-transparent text-sm ${PLAN_BADGE[shownPlan] ?? PLAN_BADGE.free}`}>
              {PLANS[shownPlan] ? tp(`${shownPlan}.name`) : shownPlan}
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
              : t('minutesUsed', { used, limit: minutesMax })}
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

      <UsageBar />

      <PlanCards plans={plans} currentPlan={plan} managePortal={paidActive} mode={mode} />
    </div>
  )
}
