import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getAuditLog, getOwners, getWorkspace } from '@/lib/admin/workspace-admin'
import { planState } from '@/lib/billing/get-workspace-plan'
import { PLAN_LIMITS, type PlanId } from '@/lib/billing/plans'
import { isUuid } from '@/lib/supabase/queries'
import { adminExtendTrial, adminResetMinutes, adminSetPlan, adminToggleCallsPaused, adminToggleDemoData, countDemoCalls } from './actions'

export const metadata = { title: 'Admin – workspace' }
export const dynamic = 'force-dynamic'

const fmt = (iso: string | number | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Prague' }) : '–'

// Odkaz do Stripe dashboardu (testovací režim podle prefixu klíče).
const stripeCustomerUrl = (id: string) => `https://dashboard.stripe.com${process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ? '/test' : ''}/customers/${id}`

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

export default async function AdminWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const w = await getWorkspace(id) // ověří admina (requireAdmin)
  if (!w) notFound()
  const [owners, audit, demoCalls] = await Promise.all([getOwners([w.clerk_user_id]), getAuditLog(id), countDemoCalls(id)])
  const owner = owners.get(w.clerk_user_id)
  const state = planState(w)
  const expired = w.billing_period_end && new Date(w.billing_period_end) <= new Date()
  const used = expired ? 0 : w.minutes_used

  async function setPlan(formData: FormData) {
    'use server'
    await adminSetPlan(id, String(formData.get('plan')) as PlanId)
  }
  async function resetMinutes() {
    'use server'
    await adminResetMinutes(id)
  }
  async function togglePaused() {
    'use server'
    await adminToggleCallsPaused(id)
  }
  async function toggleDemo() {
    'use server'
    await adminToggleDemoData(id)
  }
  async function extendTrial(formData: FormData) {
    'use server'
    await adminExtendTrial(id, Number(formData.get('days')))
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="app-title text-2xl font-semibold tracking-tight">{w.name}</h1>
        <Link href="/dashboard/admin/workspaces" className="text-sm underline">
          ← Workspaces
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="ID">
              <span className="font-mono text-xs">{w.id}</span>
            </Field>
            <Field label="Plan">
              {w.plan}
              {state.isTrialing && <Badge variant="secondary" className="ml-2">trial</Badge>}
            </Field>
            <Field label="Locale">{w.locale}</Field>
            <Field label="Created">{fmt(w.created_at)}</Field>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Stripe customer">
              {w.stripe_customer_id ? (
                <a href={stripeCustomerUrl(w.stripe_customer_id)} target="_blank" rel="noopener noreferrer" className="underline">
                  Open in Stripe ↗
                </a>
              ) : (
                '–'
              )}
            </Field>
            <Field label="Plan status">{w.plan_status}</Field>
            <Field label="Currency">{w.currency}</Field>
            <Field label="Trial ends">{fmt(w.trial_ends_at)}</Field>
            <Field label="Calls paused">{w.calls_paused ? <Badge variant="destructive">paused</Badge> : 'no'}</Field>
            <Field label="Minutes used">
              {used} / {PLAN_LIMITS[state.plan].minutesPerMonth}
            </Field>
            <Field label="Overage minutes reported">{w.overage_minutes_reported}</Field>
            <Field label="Billing period ends">{fmt(w.billing_period_end)}</Field>
            <Field label="Scheduled cancellation">{fmt(w.subscription_cancel_at)}</Field>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Owner</CardTitle>
          <CardDescription>From Clerk</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Email">{owner?.email ?? '–'}</Field>
            <Field label="Name">{owner?.name || '–'}</Field>
            <Field label="Account created">{fmt(owner?.createdAt)}</Field>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Support actions</CardTitle>
          <CardDescription>Every action is written to the audit log below.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form action={setPlan} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="plan" className="text-xs text-muted-foreground">
                Set plan (does not change the Stripe subscription)
              </label>
              <select id="plan" name="plan" defaultValue={w.plan} className="h-9 rounded-md border bg-background px-2 text-sm">
                {Object.keys(PLAN_LIMITS).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">
              Set plan
            </Button>
          </form>

          <form action={extendTrial} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="days" className="text-xs text-muted-foreground">
                Extend trial by days (1–90)
              </label>
              <Input id="days" name="days" type="number" min={1} max={90} defaultValue={7} className="w-28" />
            </div>
            <Button type="submit" size="sm" variant="outline">
              Extend trial
            </Button>
          </form>

          <div className="flex flex-wrap gap-3">
            <form action={resetMinutes}>
              <Button type="submit" size="sm" variant="outline">
                Reset minutes to 0
              </Button>
            </form>
            <form action={togglePaused}>
              <Button type="submit" size="sm" variant="outline">
                {w.calls_paused ? 'Resume calls' : 'Pause calls'}
              </Button>
            </form>
          </div>
          <p className="text-xs text-muted-foreground">
            The paused flag is recomputed from plan limits after the next call, plan change or reset, so a manual pause is not permanent.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demo data</CardTitle>
          <CardDescription>Sample calls with transcripts for demos and screenshots. They are not counted in minutes or billing.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm">
            <span className={`size-2.5 rounded-full ${demoCalls > 0 ? 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]' : 'bg-muted-foreground/40'}`} aria-hidden />
            {demoCalls > 0 ? `On – ${demoCalls} demo calls` : 'Off'}
          </div>
          <form action={toggleDemo}>
            <Button type="submit" size="sm" variant={demoCalls > 0 ? 'outline' : 'default'}>
              {demoCalls > 0 ? 'Turn off and delete demo data' : 'Turn on demo data'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>Last 20 admin actions on this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin actions yet.</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {audit.map((a) => (
                <li key={a.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{a.action}</span>
                    <span className="text-xs text-muted-foreground">{fmt(a.created_at)}</span>
                  </div>
                  <div className="mt-1 break-all font-mono text-xs text-muted-foreground">
                    {JSON.stringify(a.old_value)} → {JSON.stringify(a.new_value)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">by {a.admin_user_id}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
