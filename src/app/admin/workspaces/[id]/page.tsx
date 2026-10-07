import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAdminWorkspaceDetail } from '@/lib/admin/queries'
import { endedReasonBadge, formatClock, formatDateTime } from '@/lib/calls'
import { PLAN_BADGE } from '@/lib/plan-badge'
import { PLANS, type PlanId } from '@/lib/stripe/plans'
import { isUuid } from '@/lib/supabase/queries'
import { cn } from '@/lib/utils'
import { isCurrencyLocked } from '@/lib/billing/currency'
import { CurrencyChanger } from './currency-changer'
import { PlanChanger } from './plan-changer'

export const metadata = { title: 'Admin – Workspace details' }

/** sub_1AbCdEfGh… -> "sub_1AbC…EfGh" (celé ID se v UI nezobrazuje) */
const shorten = (id: string | null) => (id ? (id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id) : '–')

export default async function AdminWorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = isUuid(id) ? await getAdminWorkspaceDetail(id) : null
  if (!detail) notFound()
  const { workspace: w, agents, calls } = detail
  const agentName = new Map(agents.map((a) => [a.id, a.name]))

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <Link href="/admin/workspaces" className="text-sm text-muted-foreground hover:text-foreground">
          ← Workspace
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{w.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Information</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd>
                <Badge variant="outline" className={cn('border-transparent', PLAN_BADGE[w.plan] ?? PLAN_BADGE.free)}>
                  {PLANS[w.plan as PlanId]?.name ?? w.plan}
                </Badge>{' '}
                <span className="text-muted-foreground">({w.plan_status})</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Currency</dt>
              <dd>
                <Badge variant="outline">{w.currency ?? 'CZK'}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Stripe subscription</dt>
              <dd className="font-mono text-xs">{shorten(w.stripe_subscription_id)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Minutes</dt>
              <dd>
                {w.minutes_used} / {w.minutes_limit === -1 ? '∞' : w.minutes_limit}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDateTime(w.created_at)}</dd>
            </div>
          </dl>
          <PlanChanger workspaceId={w.id} currentPlan={w.plan} />
          <CurrencyChanger workspaceId={w.id} currentCurrency={w.currency ?? 'CZK'} locked={isCurrencyLocked(w)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agents ({agents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">The workspace has no agents.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vapi assistant ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.is_active ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell className="font-mono text-xs">{a.vapi_agent_id ?? '–'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest 20 calls</CardTitle>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No calls yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>End reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((c) => {
                  const reason = endedReasonBadge(c.ended_reason)
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(c.started_at ?? c.created_at)}</TableCell>
                      <TableCell>{agentName.get(c.agent_id) ?? '–'}</TableCell>
                      <TableCell>{c.caller_number ?? 'Unknown number'}</TableCell>
                      <TableCell>{formatClock(c.duration_seconds)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('border-transparent', reason.className)}>
                          {reason.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
