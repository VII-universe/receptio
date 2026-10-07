import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ActivityChart } from '@/components/dashboard/activity-chart'
import { endedReasonBadge, formatClock, formatDateTime } from '@/lib/calls'
import { getDashboardStats, type DashboardStats } from '@/lib/dashboard-stats'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types'

function Trend({ stats }: { stats: DashboardStats }) {
  if (stats.callsLastMonth === 0) {
    return <span className="text-muted-foreground">{stats.callsThisMonth > 0 ? 'New' : '—'}</span>
  }
  const pct = Math.round(stats.callsTrend)
  if (Math.abs(stats.callsTrend) <= 5) {
    return <span className="text-muted-foreground">→ {pct} % vs last month</span>
  }
  return stats.callsTrend > 0 ? (
    <span className="text-green-600">↑ {pct} % vs last month</span>
  ) : (
    <span className="text-red-600">↓ {Math.abs(pct)} % vs last month</span>
  )
}

function Tile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {children && <CardContent className="text-xs text-muted-foreground">{children}</CardContent>}
    </Card>
  )
}

function EmptyCalls({ hasAgent, canManage }: { hasAgent: boolean; canManage: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
          <path
            d="M22 14h8l4 12-6 4a30 30 0 0 0 14 14l4-6 12 4v8a6 6 0 0 1-6 6C34 56 16 38 16 20a6 6 0 0 1 6-6Z"
            className="fill-muted stroke-muted-foreground"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M44 14a14 14 0 0 1 14 14M44 22a6 6 0 0 1 6 6" className="stroke-blue-500" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div>
          <p className="text-lg font-medium">Your agent is waiting for its first call</p>
          <p className="mt-1 text-sm text-muted-foreground">Assign it a phone number and start receiving calls.</p>
        </div>
        {canManage && (
          <Link href={hasAgent ? '/dashboard/telefon' : '/dashboard/agents/new'} className={buttonVariants()}>
            {hasAgent ? 'Assign a number' : 'Create your first agent'}
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

export async function Overview({ workspace, role = 'admin' }: { workspace: Workspace; role?: 'admin' | 'member' }) {
  let stats: DashboardStats | null = null
  try {
    stats = await getDashboardStats(workspace)
  } catch (e) {
    console.error('Dashboard: failed to load stats', e)
  }

  const unlimited = stats?.minutesLimit === -1
  const percent =
    stats && !unlimited ? Math.min(100, Math.round((stats.minutesUsed / Math.max(1, stats.minutesLimit)) * 100)) : 0

  const actions = stats
    ? [
        stats.phoneNumbers === 0 && {
          href: '/dashboard/telefon',
          icon: '📞',
          title: 'Buy a number',
          text: 'So the agent can receive calls.',
        },
        stats.totalAgents < stats.agentsLimit && {
          href: '/dashboard/agents/new',
          icon: '🤖',
          title: stats.totalAgents === 0 ? 'Create your first agent' : 'New agent',
          text: 'Set up another AI assistant.',
        },
        { href: '/dashboard/hovory', icon: '📊', title: 'Call history', text: 'Transcripts and summaries of calls.' },
        (stats.plan === 'free' || stats.plan === 'starter') && {
          href: '/dashboard/fakturace',
          icon: '💳',
          title: 'Upgrade your plan',
          text: 'More minutes, agents and features.',
        },
      ].filter((a): a is { href: string; icon: string; title: string; text: string } => !!a)
    : []
  // Člen týmu smí jen číst hovory, ostatní zkratky (číslo, agenti, plán) vedou na stránky pro adminy.
  const visibleActions = role === 'admin' ? actions : actions.filter((a) => a.href === '/dashboard/hovory')

  return (
    <div className="flex flex-col gap-6">
      {!stats && (
        <p className="text-sm text-muted-foreground">Could not load the statistics, try refreshing the page.</p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Calls this month" value={stats ? String(stats.callsThisMonth) : '—'}>
          {stats && <Trend stats={stats} />}
        </Tile>
        <Tile
          label="Average call duration"
          value={stats ? (stats.avgDurationSeconds > 0 ? formatClock(stats.avgDurationSeconds) : '—') : '—'}
        >
          over the last 30 days
        </Tile>
        <Tile
          label="Minuty"
          value={stats ? `${stats.minutesUsed} / ${unlimited ? '∞' : stats.minutesLimit}` : '—'}
        >
          {stats && !unlimited && (
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={cn('h-full', percent > 90 ? 'bg-red-500' : 'bg-blue-500')} style={{ width: `${percent}%` }} />
            </div>
          )}
        </Tile>
        <Tile label="Active agents" value={stats ? `${stats.activeAgents} / ${stats.totalAgents}` : '—'}>
          agents configured
        </Tile>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calls in the last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <ActivityChart data={stats.callsByDay} />
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {visibleActions.map((a) => (
              <Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/60">
                <span className="text-xl" aria-hidden>
                  {a.icon}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{a.title}</span>
                  <span className="text-xs text-muted-foreground">{a.text}</span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {stats && stats.recentCalls.length === 0 ? (
        <EmptyCalls hasAgent={stats.totalAgents > 0} canManage={role === 'admin'} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent calls</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {stats ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Caller</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>End reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentCalls.map((c) => {
                    const reason = endedReasonBadge(c.endedReason)
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          {c.agentName} {c.isTest && <Badge variant="secondary">Test</Badge>}
                        </TableCell>
                        <TableCell>{c.callerNumber ?? 'Unknown number'}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Link href={`/dashboard/hovory/${c.id}`} className="hover:underline">
                            {formatDateTime(c.startedAt)}
                          </Link>
                        </TableCell>
                        <TableCell>{formatClock(c.durationSeconds)}</TableCell>
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
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
            <Link href="/dashboard/hovory" className="self-start text-sm text-blue-600 hover:underline">
              View all calls →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
