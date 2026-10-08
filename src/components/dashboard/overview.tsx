import Link from 'next/link'
import { AlertCircle, ArrowUpRight, Bot, CalendarCheck, CalendarDays, Clock, CreditCard, Phone, PhoneCall, PhoneIncoming, Timer, type LucideIcon } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardIcon, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatTile } from '@/components/dashboard/stat-tile'
import { BookingQuickActions } from '@/components/dashboard/booking-quick-actions'
import { ActivityChart } from '@/components/dashboard/activity-chart'
import { getBookingStats } from '@/lib/bookings/stats'
import { endedReasonBadge, formatClock, formatDateTime } from '@/lib/calls'
import { getDashboardStats, type DashboardStats } from '@/lib/dashboard-stats'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types'

async function Trend({ stats }: { stats: DashboardStats }) {
  const t = await getTranslations('dashboard')
  if (stats.callsLastMonth === 0) {
    return <span className="text-muted-foreground">{stats.callsThisMonth > 0 ? t('new') : '—'}</span>
  }
  const pct = Math.round(stats.callsTrend)
  if (Math.abs(stats.callsTrend) <= 5) {
    return <span className="text-muted-foreground">→ {t('vsLastMonth', { pct })}</span>
  }
  return stats.callsTrend > 0 ? (
    <span className="text-emerald-500">↑ {t('vsLastMonth', { pct })}</span>
  ) : (
    <span className="text-red-400">↓ {t('vsLastMonth', { pct: Math.abs(pct) })}</span>
  )
}

async function EmptyCalls({ hasAgent, canManage }: { hasAgent: boolean; canManage: boolean }) {
  const t = await getTranslations('dashboard')
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="relative flex size-20 items-center justify-center" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
          <span className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/30 rc-float">
            <PhoneIncoming className="size-8" strokeWidth={1.6} />
          </span>
        </span>
        <div>
          <p className="text-lg font-medium">{t('emptyTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('emptyText')}</p>
        </div>
        {canManage && (
          <Link href={hasAgent ? '/dashboard/phone-numbers' : '/dashboard/agents/new'} className={buttonVariants()}>
            {hasAgent ? t('assignNumber') : t('createFirstAgent')}
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

export async function Overview({ workspace, role = 'admin' }: { workspace: Workspace; role?: 'admin' | 'member' }) {
  const t = await getTranslations('dashboard')
  const tc = await getTranslations('calls')
  const tb = await getTranslations('dashboard.bookings')
  const locale = await getLocale()
  const timezone = workspace.timezone ?? 'Europe/Prague'
  let stats: DashboardStats | null = null
  const bookingStatsPromise = getBookingStats(workspace.id, timezone)
  try {
    stats = await getDashboardStats(workspace)
  } catch (e) {
    console.error('Dashboard: failed to load stats', e)
  }
  const bookingStats = await bookingStatsPromise
  const whenFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: timezone })

  const unlimited = stats?.minutesLimit === -1
  const percent =
    stats && !unlimited ? Math.min(100, Math.round((stats.minutesUsed / Math.max(1, stats.minutesLimit)) * 100)) : 0

  const actions = stats
    ? [
        stats.phoneNumbers === 0 && {
          href: '/dashboard/phone-numbers',
          icon: Phone,
          title: t('buyNumber'),
          text: t('buyNumberText'),
        },
        stats.totalAgents < stats.agentsLimit && {
          href: '/dashboard/agents/new',
          icon: Bot,
          title: stats.totalAgents === 0 ? t('createFirstAgent') : t('newAgent'),
          text: t('newAgentText'),
        },
        { href: '/dashboard/calls', icon: PhoneCall, title: t('callHistory'), text: t('callHistoryText') },
        { href: '/dashboard/calendar', icon: CalendarDays, title: tb('openCalendar'), text: tb('upcoming') },
        (stats.plan === 'free' || stats.plan === 'starter') && {
          href: '/dashboard/billing',
          icon: CreditCard,
          title: t('upgradePlan'),
          text: t('upgradePlanText'),
        },
      ].filter((a): a is { href: string; icon: LucideIcon; title: string; text: string } => !!a)
    : []
  // Člen týmu smí jen číst hovory, ostatní zkratky (číslo, agenti, plán) vedou na stránky pro adminy.
  const visibleActions = role === 'admin' ? actions : actions.filter((a) => a.href === '/dashboard/calls' || a.href === '/dashboard/calendar')

  return (
    <div className="flex flex-col gap-6">
      {!stats && (
        <p className="text-sm text-muted-foreground">{t('statsFailed')}</p>
      )}

      {bookingStats && bookingStats.pending > 0 && (
        <Link
          href="/dashboard/calendar"
          className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-200"
        >
          <AlertCircle className="size-5 shrink-0" aria-hidden />
          <span className="flex-1 font-medium">{tb('banner', { count: bookingStats.pending })}</span>
          <span className="flex items-center gap-1 font-semibold">
            {tb('review')} <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={PhoneIncoming} label={t('callsThisMonth')} value={stats ? String(stats.callsThisMonth) : '—'}>
          {stats && <Trend stats={stats} />}
        </StatTile>
        <StatTile
          icon={Timer}
          label={t('avgDuration')}
          value={stats ? (stats.avgDurationSeconds > 0 ? formatClock(stats.avgDurationSeconds) : '—') : '—'}
        >
          {t('last30Days')}
        </StatTile>
        <StatTile
          icon={Clock}
          label={t('minutes')}
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
              <div className={cn('h-full rounded-full transition-all duration-700', percent > 90 ? 'bg-gradient-to-r from-red-500 to-orange-400' : 'bg-gradient-to-r from-indigo-500 to-violet-400')} style={{ width: `${percent}%` }} />
            </div>
          )}
        </StatTile>
        <StatTile icon={Bot} label={t('activeAgents')} value={stats ? `${stats.activeAgents} / ${stats.totalAgents}` : '—'}>
          {t('agentsConfigured')}
        </StatTile>
      </div>

      {bookingStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-3">
              <CardIcon icon={CalendarCheck} />
              {tb('upcoming')}
              <Link href="/dashboard/calendar" className="ml-auto text-sm font-medium text-primary hover:underline">
                {tb('openCalendar')}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: tb('today'), value: bookingStats.today, tone: '' },
                { label: tb('next7'), value: bookingStats.next7Days, tone: '' },
                { label: tb('pending'), value: bookingStats.pending, tone: bookingStats.pending > 0 ? 'text-amber-600 dark:text-amber-300' : '' },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                  <div className={cn('text-2xl font-semibold tabular-nums tracking-tight', m.tone)}>{m.value}</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>
            {bookingStats.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tb('none')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {bookingStats.upcoming.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <span className="w-28 shrink-0 text-xs font-semibold capitalize tabular-nums text-muted-foreground">{whenFmt.format(new Date(b.startsAt))}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{b.callerName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {b.title} · {b.agentName}
                        {b.fromCall && ` · ${tb('bookedByAi')}`}
                      </span>
                    </span>
                    {b.status === 'pending' ? (
                      <BookingQuickActions bookingId={b.id} />
                    ) : (
                      <Badge variant="outline" className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        {tb('confirmed')}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('callsLast7')}</CardTitle>
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
            <CardTitle>{t('quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {visibleActions.map((a) => (
              <Link key={a.href} href={a.href} className="group flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 transition-all hover:border-primary/30 hover:bg-muted">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/25" aria-hidden>
                  <a.icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{a.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{a.text}</span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden />
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
            <CardTitle>{t('recentCalls')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {stats ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('colAgent')}</TableHead>
                    <TableHead>{t('colCaller')}</TableHead>
                    <TableHead>{t('colTime')}</TableHead>
                    <TableHead>{t('colDuration')}</TableHead>
                    <TableHead>{t('colEndReason')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentCalls.map((c) => {
                    const reason = endedReasonBadge(c.endedReason)
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          {c.agentName} {c.isTest && <Badge variant="secondary">{t('test')}</Badge>}
                        </TableCell>
                        <TableCell>{c.callerNumber ?? t('unknownNumber')}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Link href={`/dashboard/calls/${c.id}`} className="hover:underline">
                            {formatDateTime(c.startedAt, locale)}
                          </Link>
                        </TableCell>
                        <TableCell>{formatClock(c.durationSeconds)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('border-transparent', reason.className)}>
                            {reason.labelKey ? tc(`reason.${reason.labelKey}`) : reason.label}
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
            <Link href="/dashboard/calls" className="self-start text-sm font-medium text-primary hover:underline">
              {t('viewAll')}
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
