import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentWorkspace } from '@/lib/auth'
import { isStripeConfigured } from '@/lib/stripe/client'
import { PLANS, type PlanId } from '@/lib/stripe/plans'
import { PlanCards, type PlanCardData } from './plan-cards'

export const metadata = { title: 'Fakturace' }

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Aktivní', variant: 'default' },
  trialing: { label: 'Zkušební období', variant: 'secondary' },
  past_due: { label: 'Po splatnosti', variant: 'destructive' },
  unpaid: { label: 'Neuhrazeno', variant: 'destructive' },
  canceled: { label: 'Zrušeno', variant: 'outline' },
  incomplete: { label: 'Čeká na platbu', variant: 'secondary' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('cs-CZ', {
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
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/onboarding')
  const { success } = await searchParams

  const plan = workspace.plan as PlanId
  const status = STATUS[workspace.plan_status] ?? { label: workspace.plan_status, variant: 'outline' as const }

  // Skončené období (např. plán Zdarma) se zobrazuje jako vynulované.
  const expired = workspace.billing_period_end && new Date(workspace.billing_period_end) <= new Date()
  const used = expired ? 0 : workspace.minutes_used
  const unlimited = workspace.minutes_limit === -1
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, workspace.minutes_limit)) * 100))

  const paidActive = plan !== 'free' && !!workspace.stripe_subscription_id
  const plans: PlanCardData[] = (Object.keys(PLANS) as PlanId[]).map((id) => ({
    id,
    name: PLANS[id].nameCs,
    price: PLANS[id].price,
    features: [...PLANS[id].features],
    // Cena bez nastaveného price ID nejde objednat.
    purchasable: id !== 'free' && !!PLANS[id].stripePriceId,
  }))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Fakturace</h1>

      {success === 'true' && (
        <div className="rounded-lg border border-green-600/30 bg-green-600/10 p-4 text-sm">
          Děkujeme, platba proběhla. Aktivace plánu může trvat několik sekund, případně obnovte stránku.
        </div>
      )}
      {!isStripeConfigured() && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Platby zatím nejsou nastavené, předplatné nelze objednat.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardDescription>Aktuální plán</CardDescription>
          <CardTitle className="flex items-center gap-3 text-2xl">
            {PLANS[plan]?.nameCs ?? plan}
            <Badge variant={status.variant}>{status.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="text-sm">
            {unlimited
              ? `${used} minut použito tento měsíc (neomezeno)`
              : `${used} / ${workspace.minutes_limit} minut použito tento měsíc`}
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
                className={percent > 90 ? 'h-full bg-red-500' : 'h-full bg-primary'}
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
          {workspace.billing_period_start && workspace.billing_period_end && (
            <div className="text-sm text-muted-foreground">
              Fakturační období: {formatDate(workspace.billing_period_start)} –{' '}
              {formatDate(workspace.billing_period_end)}
            </div>
          )}
        </CardContent>
      </Card>

      <PlanCards plans={plans} currentPlan={plan} managePortal={paidActive} />
    </div>
  )
}
