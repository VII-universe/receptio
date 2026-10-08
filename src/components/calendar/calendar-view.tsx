'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarClock, ChevronLeft, ChevronRight, Loader2, MousePointerClick, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { addDays, localDate, localParts, weekStart, zonedToUtc } from '@/lib/bookings/time'
import { cn } from '@/lib/utils'
import type { Booking } from '@/types'
import { BookingDetail } from './booking-detail'
import { BookingForm } from './booking-form'
import { STATUS_DOT, STATUS_STYLES } from './booking-utils'
import { DayCalls } from './day-calls'
import { TimeGrid } from './time-grid'

interface AgentInfo {
  id: string
  name: string
  bookingEnabled: boolean
}

type View = 'day' | 'week' | 'month'

const DEFAULT_FROM = 7
const DEFAULT_TO = 20

const minutesOfDay = (iso: string, tz: string) => {
  const p = localParts(new Date(iso), tz)
  return p.hour * 60 + p.minute
}
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/**
 * Kalendář rezervací: denní, týdenní (časová osa po 15 minutách) a měsíční pohled.
 * Rezervace od AI se do kalendáře vkládají samy; ručně se vytvářejí tažením po časové ose. Čas je v zóně workspace.
 */
export function CalendarView({ agents, timezone }: { agents: AgentInfo[]; timezone: string }) {
  const t = useTranslations('calendar')
  const locale = useLocale()
  const today = useMemo(() => localDate(new Date(), timezone), [timezone])
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState(today)
  const [agentId, setAgentId] = useState('')
  const [showCancelled, setShowCancelled] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [create, setCreate] = useState<{ open: boolean; date: string; time: string; duration: number }>({ open: false, date: today, time: '09:00', duration: 30 })

  const agentName = useCallback((id: string) => agents.find((a) => a.id === id)?.name ?? '–', [agents])
  const canCreate = agents.length > 0

  const openCreate = (date: string, startMin = 9 * 60, endMin = startMin + 30) => {
    if (!canCreate) return
    setSelectedId(null)
    setCreate({ open: true, date, time: hhmm(startMin), duration: Math.max(15, endMin - startMin) })
  }

  // Zobrazené období: den, týden (po–ne) nebo 6 týdnů měsíční mřížky.
  const range = useMemo(() => {
    if (view === 'day') return { start: anchor, days: 1, end: addDays(anchor, 1) }
    if (view === 'week') {
      const start = weekStart(anchor)
      return { start, days: 7, end: addDays(start, 7) }
    }
    const start = weekStart(`${anchor.slice(0, 7)}-01`)
    return { start, days: 42, end: addDays(start, 42) }
  }, [view, anchor])

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const all: Booking[] = []
      let cursor: string | null = null
      const from = zonedToUtc(range.start, '00:00', timezone).toISOString()
      const to = zonedToUtc(range.end, '00:00', timezone).toISOString()
      for (let page = 0; page < 10; page++) {
        const q = new URLSearchParams({ date_from: from, date_to: to, limit: '500' })
        if (agentId) q.set('agent_id', agentId)
        if (cursor) q.set('cursor', cursor)
        const res = await fetch(`/api/bookings?${q}`)
        if (!res.ok) throw new Error()
        const data = (await res.json()) as { bookings: Booking[]; nextCursor: string | null }
        all.push(...data.bookings)
        cursor = data.nextCursor
        if (!cursor) break
      }
      setBookings(all)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [range, timezone, agentId])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(() => bookings.filter((b) => showCancelled || b.status !== 'cancelled'), [bookings, showCancelled])
  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of visible) {
      const d = localDate(new Date(b.starts_at), timezone)
      map.set(d, [...(map.get(d) ?? []), b])
    }
    return map
  }, [visible, timezone])
  const pending = bookings.filter((b) => b.status === 'pending').length
  const selected = bookings.find((b) => b.id === selectedId) ?? null

  const dayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }), [locale])
  const timeFmt = useMemo(() => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: timezone }), [locale, timezone])
  const title = useMemo(() => {
    const noon = (s: string) => new Date(`${s}T12:00:00Z`)
    if (view === 'month') return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(noon(anchor))
    if (view === 'day') return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(noon(anchor))
    const end = addDays(range.start, 6)
    const short = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
    return `${short.format(noon(range.start))} – ${short.format(noon(end))} ${noon(end).getUTCFullYear()}`
  }, [view, anchor, range.start, locale])

  const step = (dir: -1 | 1) => {
    if (view === 'day') return setAnchor(addDays(anchor, dir))
    if (view === 'week') return setAnchor(addDays(anchor, 7 * dir))
    const [y, m] = anchor.split('-').map(Number)
    const next = new Date(Date.UTC(y, m - 1 + dir, 1, 12))
    setAnchor(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`)
  }
  const openDay = (d: string) => {
    setAnchor(d)
    setView('day')
  }

  const onChanged = (b: Booking | null, message?: string) => {
    if (message) toast.add({ type: 'success', title: message })
    if (b) setBookings((list) => list.map((x) => (x.id === b.id ? b : x)))
    else void load()
  }

  // Svislý rozsah časové osy: výchozí 7–20 h, rozšíří se podle rezervací.
  const { fromHour, toHour } = useMemo(() => {
    let from = DEFAULT_FROM
    let to = DEFAULT_TO
    for (const b of visible) {
      from = Math.min(from, Math.floor(minutesOfDay(b.starts_at, timezone) / 60))
      const e = minutesOfDay(b.ends_at, timezone)
      to = Math.max(to, Math.ceil((e === 0 ? 1440 : e) / 60))
    }
    return { fromHour: Math.max(0, from), toHour: Math.min(24, to) }
  }, [visible, timezone])

  const selectedAgent = agents.find((a) => a.id === (agentId || selected?.agent_id))
  const dayKeys = Array.from({ length: range.days }, (_, i) => addDays(range.start, i))
  const grid = (days: string[], minWidth: number, onDayClick?: (d: string) => void) => (
    <TimeGrid
      days={days}
      today={today}
      fromHour={fromHour}
      toHour={toHour}
      byDay={byDay}
      timezone={timezone}
      minutesOfDay={minutesOfDay}
      selectedId={selectedId}
      canCreate={canCreate}
      dayLabel={(d) => dayFmt.format(new Date(`${d}T12:00:00Z`))}
      dayNumber={(d) => Number(d.slice(8))}
      onDayClick={onDayClick}
      onSelectBooking={setSelectedId}
      onCreate={openCreate}
      timeFmt={timeFmt}
      createLabel={t('newBooking')}
      minWidth={minWidth}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label={t('prev')} onClick={() => step(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" aria-label={t('next')} onClick={() => step(1)}>
            <ChevronRight />
          </Button>
          <Button variant="outline" onClick={() => setAnchor(today)}>
            {t('today')}
          </Button>
        </div>
        <h2 className="min-w-40 text-lg font-semibold capitalize tracking-tight">{title}</h2>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {agents.length > 1 && (
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-label={t('agent')} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5">
              <option value="">{t('allAgents')}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          <div role="group" className="flex rounded-lg bg-muted p-0.5">
            {(['day', 'week', 'month'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn('rounded-md px-3 py-1 text-sm font-medium transition-colors', view === v ? 'bg-primary/15 text-foreground ring-1 ring-primary/25' : 'text-muted-foreground hover:text-foreground')}
              >
                {t(v)}
              </button>
            ))}
          </div>
          <Button onClick={() => openCreate(view === 'day' ? anchor : today)} disabled={!canCreate}>
            <Plus /> {t('newBooking')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {(['confirmed', 'pending', 'cancelled'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', STATUS_DOT[s])} aria-hidden /> {t(`status.${s}`)}
          </span>
        ))}
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" className="accent-primary" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> {t('showCancelled')}
        </label>
        {pending > 0 && <span className="font-medium text-amber-600 dark:text-amber-300">{t('pendingCount', { count: pending })}</span>}
        {view !== 'month' && canCreate && (
          <span className="flex items-center gap-1.5">
            <MousePointerClick className="size-3.5" aria-hidden /> {t('gridHint')}
          </span>
        )}
      </div>

      {agents.length === 0 && <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">{t('noAgents')}</p>}
      {selectedAgent && !selectedAgent.bookingEnabled && agentId && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-200">
          {t('bookingsOff')}{' '}
          <Link href={`/dashboard/agents/${selectedAgent.id}?tab=dostupnost`} className="font-medium underline">
            {t('av.title')}
          </Link>
        </p>
      )}
      {error && (
        <p className="flex items-center gap-3 text-sm text-destructive">
          {t('loadFailed')}
          <Button variant="outline" size="sm" onClick={() => void load()}>
            {t('av.retry')}
          </Button>
        </p>
      )}

      {view === 'week' && grid(dayKeys, 720, openDay)}

      {view === 'day' && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          {grid([anchor], 320)}
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3" aria-label={t('dayBookings')}>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="size-4 text-primary" aria-hidden /> {t('dayBookings')}
                <span className="font-normal text-muted-foreground">({(byDay.get(anchor) ?? []).length})</span>
              </h3>
              {(byDay.get(anchor) ?? []).length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t('noBookingsDay')}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {(byDay.get(anchor) ?? []).map((b) => (
                    <li key={b.id}>
                      <button type="button" onClick={() => setSelectedId(b.id)} className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors', STATUS_STYLES[b.status])}>
                        <span className="w-24 shrink-0 text-xs font-semibold tabular-nums">
                          {timeFmt.format(new Date(b.starts_at))} – {timeFmt.format(new Date(b.ends_at))}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {b.caller_name} · {b.title}
                        </span>
                        {b.call_log_id && <span className="size-1.5 shrink-0 rounded-full bg-primary" title={t('bookedByAi')} aria-label={t('bookedByAi')} />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <DayCalls date={anchor} agentId={agentId} timezone={timezone} bookings={bookings} />
          </div>
        </div>
      )}

      {view === 'month' && (
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 dark:backdrop-blur-xl">
          <div className="grid grid-cols-7 border-b border-border text-center text-xs uppercase tracking-wider text-muted-foreground">
            {dayKeys.slice(0, 7).map((d) => (
              <div key={d} className="py-2">
                {dayFmt.format(new Date(`${d}T12:00:00Z`))}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {dayKeys.map((d) => {
              const items = byDay.get(d) ?? []
              const inMonth = d.slice(0, 7) === anchor.slice(0, 7)
              return (
                <div
                  key={d}
                  role="button"
                  tabIndex={0}
                  aria-label={d}
                  onClick={() => openDay(d)}
                  onKeyDown={(e) => e.key === 'Enter' && openDay(d)}
                  className={cn('min-h-24 cursor-pointer border-b border-l border-border p-1.5 outline-none transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 [&:nth-child(7n+1)]:border-l-0', !inMonth && 'bg-muted/30 text-muted-foreground', d === today && 'bg-primary/10')}
                >
                  <span className={cn('mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-medium', d === today && 'bg-primary text-primary-foreground')}>{Number(d.slice(8))}</span>
                  <div className="flex flex-col gap-0.5">
                    {items.slice(0, 3).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedId(b.id)
                        }}
                        className={cn('truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] transition-colors', STATUS_STYLES[b.status])}
                      >
                        <span className="tabular-nums">{timeFmt.format(new Date(b.starts_at))}</span> {b.caller_name}
                      </button>
                    ))}
                    {items.length > 3 && <span className="px-1.5 text-left text-[11px] text-muted-foreground">{t('more', { count: items.length - 3 })}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && !error && visible.length === 0 && canCreate && view !== 'day' && (
        <p className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
          <CalendarClock className="size-4" aria-hidden /> {t('empty')}
        </p>
      )}

      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-none" onClick={() => setSelectedId(null)} aria-hidden />
          <aside role="dialog" aria-label={t('details')} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col gap-4 overflow-y-auto border-l border-border bg-popover p-5 text-popover-foreground shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{t('details')}</h2>
              <Button variant="ghost" size="icon" aria-label={t('close')} onClick={() => setSelectedId(null)}>
                <X />
              </Button>
            </div>
            <BookingDetail booking={selected} agentName={agentName(selected.agent_id)} timezone={timezone} onChanged={onChanged} onClose={() => setSelectedId(null)} />
          </aside>
        </>
      )}

      <BookingForm
        open={create.open}
        onOpenChange={(open) => setCreate((c) => ({ ...c, open }))}
        agents={agents}
        defaultAgentId={agentId || agents.find((a) => a.bookingEnabled)?.id || agents[0]?.id || ''}
        defaultDate={create.date}
        defaultTime={create.time}
        defaultDuration={create.duration}
        timezone={timezone}
        onCreated={() => {
          setCreate((c) => ({ ...c, open: false }))
          onChanged(null, t('created'))
        }}
      />
    </div>
  )
}
