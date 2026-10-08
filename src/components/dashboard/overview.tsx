import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { AlertTriangle, ArrowUpRight, Bot, CalendarCheck, CalendarDays, Clock, CreditCard, Hourglass, LineChart, Phone, PhoneCall, PhoneIncoming, PhoneMissed, Timer, Gauge, CircleAlert, CheckCircle2, type LucideIcon } from 'lucide-react'
import { Attention, type AttentionItem } from '@/components/dashboard/attention'
import { ActivityChart } from '@/components/dashboard/activity-chart'
import { BookingAgenda } from '@/components/dashboard/booking-agenda'
import { DashboardShell, type WidgetDef } from '@/components/dashboard/dashboard-shell'
import { Delta, KpiTile } from '@/components/dashboard/kpi-tile'
import { TodayOverview } from '@/components/dashboard/today-overview'
import { RecentCalls } from '@/components/dashboard/recent-calls'
import { CardIcon } from '@/components/ui/card'
import { getAgenda } from '@/lib/bookings/stats'
import { formatClock } from '@/lib/calls'
import { getDashboardStats, type DashboardStats } from '@/lib/dashboard-stats'
import { getOverviewData, type OverviewData, type Range } from '@/lib/dashboard-overview'
import { getAgentsByWorkspaceId } from '@/lib/supabase/queries'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types'

/** Přehled: filtry nad obsahem (období, agent) a widgety, které si uživatel může skrýt a přeskládat. */
export async function Overview({ workspace, role = 'admin', range, agentId }: { workspace: Workspace; role?: 'admin' | 'member'; range: Range; agentId: string }) {
  const t = await getTranslations('dashboard')
  const to = await getTranslations('dashboard.ov')
  const tb = await getTranslations('dashboard.bookings')
  const timezone = workspace.timezone ?? 'Europe/Prague'
  const admin = role === 'admin'

  let stats: DashboardStats | null = null
  const [overviewResult, agenda, agents] = await Promise.all([
    getOverviewData(workspace.id, timezone, range, agentId || undefined).catch((e) => {
      console.error('Dashboard: failed to load overview data', e)
      return null as OverviewData | null
    }),
    getAgenda(workspace.id, agentId || undefined),
    getAgentsByWorkspaceId(workspace.id).catch(() => []),
  ])
  try {
    stats = await getDashboardStats(workspace)
  } catch (e) {
    console.error('Dashboard: failed to load stats', e)
  }
  const data = overviewResult

  // ───────── Co vyžaduje pozornost ─────────
  const items: AttentionItem[] = []
  const pending = agenda?.filter((b) => b.status === 'pending').length ?? 0
  if (pending > 0) items.push({ id: 'pending', tone: 'warning', icon: Hourglass, title: to('att.pendingTitle', { count: pending }), text: to('att.pendingText'), href: '#w-agenda', cta: to('att.review') })
  if (stats && stats.minutesLimit > 0 && admin) {
    const used = stats.minutesUsed / stats.minutesLimit
    if (used >= 1) items.push({ id: 'limit', tone: 'critical', icon: CircleAlert, title: to('att.limitTitle'), text: to('att.limitText'), href: '/dashboard/billing', cta: to('att.upgrade') })
    else if (used >= 0.8) items.push({ id: 'near', tone: 'warning', icon: Gauge, title: to('att.nearTitle', { pct: Math.round(used * 100) }), text: to('att.nearText'), href: '/dashboard/billing', cta: to('att.upgrade') })
  }
  if (data && data.current.missed > 0) items.push({ id: 'missed', tone: 'info', icon: PhoneMissed, title: to('att.missedTitle', { count: data.current.missed }), text: to('att.missedText', { days: range }), href: '/dashboard/calls', cta: to('att.open') })
  if (stats && admin) {
    if (stats.totalAgents === 0) items.push({ id: 'agent', tone: 'info', icon: Bot, title: to('att.noAgentTitle'), text: to('att.noAgentText'), href: '/dashboard/agents/new', cta: to('att.create') })
    else if (stats.phoneNumbers === 0) items.push({ id: 'number', tone: 'info', icon: Phone, title: to('att.noNumberTitle'), text: to('att.noNumberText'), href: '/dashboard/phone-numbers', cta: to('att.assign') })
  }

  // ───────── Ukazatele ─────────
  const cur = data?.current
  const prev = data?.previous
  const unlimited = stats?.minutesLimit === -1
  const pct = stats && !unlimited ? Math.min(100, Math.round((stats.minutesUsed / Math.max(1, stats.minutesLimit)) * 100)) : 0
  const meterState = pct >= 100 ? 'over' : pct >= 80 ? 'near' : 'ok'
  const suffix = ` ${to('vsPrevious', { days: range })}`
  const conversion = cur && cur.calls > 0 ? Math.round((cur.bookedFromCalls / cur.calls) * 100) : null

  const kpis = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiTile
        icon={PhoneIncoming}
        label={to('kpi.calls', { days: range })}
        value={cur ? String(cur.calls) : '—'}
        spark={data?.series.map((d) => d.calls)}
        footer={cur && prev && <Delta current={cur.calls} previous={prev.calls} suffix={suffix} newLabel={t('new')} />}
      />
      <KpiTile
        icon={CalendarCheck}
        label={to('kpi.bookings', { days: range })}
        value={cur ? String(cur.bookings) : '—'}
        spark={data?.series.map((d) => d.bookings)}
        footer={
          cur && prev && (
            <span className="flex flex-col gap-0.5">
              <Delta current={cur.bookings} previous={prev.bookings} suffix={suffix} newLabel={t('new')} />
              {conversion !== null && <span>{to('conversion', { pct: conversion })}</span>}
            </span>
          )
        }
      />
      <KpiTile
        icon={Timer}
        label={to('kpi.duration')}
        value={cur && cur.avgDurationSeconds > 0 ? formatClock(cur.avgDurationSeconds) : '—'}
        footer={cur && prev && <Delta current={cur.avgDurationSeconds} previous={prev.avgDurationSeconds} suffix={suffix} newLabel={t('new')} neutral />}
      />
      <KpiTile
        icon={Clock}
        label={to('kpi.minutes')}
        value={stats ? `${stats.minutesUsed} / ${unlimited ? '∞' : stats.minutesLimit}` : '—'}
        hint={
          stats &&
          !unlimited && (
            <div className="relative">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={to('kpi.minutes')}>
                <div className={cn('h-full rounded-full transition-all duration-700', meterState === 'over' ? 'bg-gradient-to-r from-red-500 to-orange-400' : meterState === 'near' ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-indigo-500 to-violet-400')} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        }
        footer={
          stats && (
            <span className={cn('inline-flex items-center gap-1 font-medium', meterState === 'over' ? 'text-red-600 dark:text-red-400' : meterState === 'near' ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>
              {meterState === 'ok' ? <CheckCircle2 className="size-3.5" aria-hidden /> : <AlertTriangle className="size-3.5" aria-hidden />}
              {unlimited ? to('meter.unlimited') : to(`meter.${meterState}`, { pct })}
            </span>
          )
        }
      />
    </div>
  )

  // ───────── Rychlé akce ─────────
  type Action = { href: string; icon: LucideIcon; title: string; text: string }
  const actions: Action[] = [
    { href: '/dashboard/calendar', icon: CalendarDays, title: tb('openCalendar'), text: tb('upcoming') },
    { href: '/dashboard/calls', icon: PhoneCall, title: t('callHistory'), text: t('callHistoryText') },
    ...(admin && stats
      ? ([
          stats.phoneNumbers === 0 && { href: '/dashboard/phone-numbers', icon: Phone, title: t('buyNumber'), text: t('buyNumberText') },
          stats.totalAgents < stats.agentsLimit && { href: '/dashboard/agents/new', icon: Bot, title: stats.totalAgents === 0 ? t('createFirstAgent') : t('newAgent'), text: t('newAgentText') },
          (stats.plan === 'free' || stats.plan === 'starter') && { href: '/dashboard/billing', icon: CreditCard, title: t('upgradePlan'), text: t('upgradePlanText') },
        ].filter(Boolean) as Action[])
      : []),
  ]

  const widgets: WidgetDef[] = [
    { id: 'attention', label: to('w.attention'), span: 'full', node: <Attention items={items} okLabel={to('att.ok')} /> },
    { id: 'kpis', label: to('w.kpis'), span: 'full', node: kpis },
    {
      id: 'agenda',
      label: to('w.agenda'),
      span: 'wide',
      node: agenda ? <BookingAgenda timezone={timezone} /> : <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">{tb('unavailable')}</p>,
    },
    {
      id: 'activity',
      label: to('w.activity'),
      span: 'narrow',
      node: (
        // Buňka je na výšku rozdělená: nahoře aktivita (2/3), dole dnešní den v kostce (1/3).
        // Výška buňky se řídí sousední agendou; obsah ji nikdy nezvětšuje (karta je absolutně vložená), takže poměr zůstává pevný: graf 50 %, volný čas 50 %.
        <div className="relative h-full min-h-[34rem]">
         <div className="absolute inset-0 grid grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] dark:backdrop-blur-xl">
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden px-5 pb-2 pt-4">
            <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
              <CardIcon icon={LineChart} /> {to('activityTitle', { days: range })}
            </h2>
            <div className="min-h-0 flex-1">{data ? <ActivityChart data={data.series} /> : <p className="text-sm text-muted-foreground">{t('statsFailed')}</p>}</div>
          </div>
          <div className="min-h-0 overflow-hidden border-t border-border bg-muted/20 px-5 pb-4 pt-3">
            <TodayOverview timezone={timezone} />
          </div>
         </div>
        </div>
      ),
    },
    { id: 'calls', label: to('w.calls'), span: 'full', node: <RecentCalls workspaceId={workspace.id} timezone={timezone} agentId={agentId || undefined} /> },
    {
      id: 'actions',
      label: to('w.actions'),
      span: 'full',
      node: (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="group flex h-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-all hover:border-primary/30 hover:bg-muted/60 dark:backdrop-blur-xl">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/25" aria-hidden>
                  <a.icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{a.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{a.text}</span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ),
    },
  ]

  return <DashboardShell range={range} agentId={agentId} agents={agents.map((a) => ({ id: a.id, name: a.name }))} widgets={widgets} agenda={agenda} />
}
