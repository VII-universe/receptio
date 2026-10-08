'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarClock, ChevronLeft, ChevronRight, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { addDays, localDate, localParts, weekStart, zonedToUtc } from '@/lib/bookings/time'
import { cn } from '@/lib/utils'
import type { Booking } from '@/types'
import { BookingDetail } from './booking-detail'
import { BookingForm } from './booking-form'
import { layoutLanes, STATUS_DOT, STATUS_STYLES } from './booking-utils'

interface AgentInfo {
  id: string
  name: string
  bookingEnabled: boolean
}

const ROW_PX = 28 // jedna řádka mřížky = 30 minut
const DEFAULT_FROM = 7
const DEFAULT_TO = 20

const minutesOfDay = (iso: string, tz: string) => {
  const p = localParts(new Date(iso), tz)
  return p.hour * 60 + p.minute
}

/** Kalendář rezervací: týdenní mřížka (CSS Grid) a měsíční přehled. Čas se zobrazuje v časové zóně workspace. */
export function CalendarView({ agents, timezone }: { agents: AgentInfo[]; timezone: string }) {
  const t = useTranslations('calendar')
  const locale = useLocale()
  const today = useMemo(() => localDate(new Date(), timezone), [timezone])
  const [view, setView] = useState<'week' | 'month'>('week')
  const [anchor, setAnchor] = useState(today)
  const [agentId, setAgentId] = useState('')
  const [showCancelled, setShowCancelled] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createDate, setCreateDate] = useState<string | null>(null)

  const agentName = useCallback((id: string) => agents.find((a) => a.id === id)?.name ?? '–', [agents])

  // Zobrazené období: týden (po–ne) nebo 6 týdnů měsíční mřížky.
  const range = useMemo(() => {
    if (view === 'week') {
      const start = weekStart(anchor)
      return { start, days: 7, end: addDays(start, 7) }
    }
    const first = `${anchor.slice(0, 7)}-01`
    const start = weekStart(first)
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
    const f = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
    const d = (s: string) => new Date(`${s}T12:00:00Z`)
    if (view === 'month') return f.format(d(anchor))
    const end = addDays(range.start, 6)
    const short = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
    return `${short.format(d(range.start))} – ${short.format(d(end))} ${d(end).getUTCFullYear()}`
  }, [view, anchor, range.start, locale])

  const step = (dir: -1 | 1) => {
    if (view === 'week') return setAnchor(addDays(anchor, 7 * dir))
    const [y, m] = anchor.split('-').map(Number)
    const next = new Date(Date.UTC(y, m - 1 + dir, 1, 12))
    setAnchor(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`)
  }

  const onChanged = (b: Booking | null, message?: string) => {
    if (message) toast.add({ type: 'success', title: message })
    if (b) setBookings((list) => list.map((x) => (x.id === b.id ? b : x)))
    else void load()
  }

  // Svislý rozsah týdenní mřížky: výchozí 7–20 h, rozšíří se podle rezervací.
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
  const rows = (toHour - fromHour) * 2

  const selectedAgent = agents.find((a) => a.id === (agentId || selected?.agent_id))
  const dayKeys = Array.from({ length: range.days }, (_, i) => addDays(range.start, i))

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
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              aria-label={t('agent')}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5"
            >
              <option value="">{t('allAgents')}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          <div role="group" className="flex rounded-lg bg-muted p-0.5">
            {(['week', 'month'] as const).map((v) => (
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
          <Button
            onClick={() => {
              setCreateDate(null)
              setCreateOpen(true)
            }}
            disabled={agents.length === 0}
          >
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

      {view === 'week' ? (
        <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-foreground/10 dark:backdrop-blur-xl">
          <div className="grid min-w-[720px]" style={{ gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))', gridTemplateRows: `auto repeat(${rows}, ${ROW_PX}px)` }}>
            {/* záhlaví dnů */}
            <div className="sticky top-0 border-b border-border" />
            {dayKeys.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setCreateDate(d)
                  setCreateOpen(true)
                }}
                disabled={agents.length === 0}
                className={cn('border-b border-l border-border px-2 py-2 text-center text-xs transition-colors hover:bg-muted', d === today && 'bg-primary/10')}
                style={{ gridColumn: i + 2, gridRow: 1 }}
              >
                <span className="block uppercase tracking-wider text-muted-foreground">{dayFmt.format(new Date(`${d}T12:00:00Z`))}</span>
                <span className={cn('mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold', d === today && 'bg-primary text-primary-foreground')}>{Number(d.slice(8))}</span>
              </button>
            ))}
            {/* časová osa a linky */}
            {Array.from({ length: rows }, (_, r) => (
              <div key={`l${r}`} className="contents">
                <div className={cn('pr-2 text-right text-[10px] text-muted-foreground', r % 2 === 0 && 'border-t border-border')} style={{ gridColumn: 1, gridRow: r + 2 }}>
                  {r % 2 === 0 && <span className="relative -top-1.5">{String(fromHour + r / 2).padStart(2, '0')}:00</span>}
                </div>
                {dayKeys.map((d, i) => (
                  <div key={d} className={cn('border-l border-border', r % 2 === 0 ? 'border-t' : 'border-t border-t-border/40', d === today && 'bg-primary/5')} style={{ gridColumn: i + 2, gridRow: r + 2 }} />
                ))}
              </div>
            ))}
            {/* rezervace */}
            {dayKeys.map((d, i) => {
              const items = layoutLanes(
                (byDay.get(d) ?? []).map((b) => {
                  const startMin = minutesOfDay(b.starts_at, timezone)
                  const endRaw = minutesOfDay(b.ends_at, timezone)
                  return { b, startMin, endMin: endRaw <= startMin ? 1440 : endRaw }
                })
              )
              return items.map(({ b, startMin, endMin, lane, lanes }) => {
                const rowStart = Math.max(0, Math.floor((startMin - fromHour * 60) / 30))
                const rowEnd = Math.min(rows, Math.max(rowStart + 1, Math.ceil((endMin - fromHour * 60) / 30)))
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    title={`${b.caller_name} – ${b.title}`}
                    className={cn('z-10 m-0.5 overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition-colors', STATUS_STYLES[b.status], selectedId === b.id && 'ring-2 ring-primary')}
                    style={{
                      gridColumn: i + 2,
                      gridRow: `${rowStart + 2} / ${rowEnd + 2}`,
                      width: `calc(${100 / lanes}% - 4px)`,
                      marginLeft: `calc(${(100 / lanes) * lane}% + 2px)`,
                    }}
                  >
                    <span className="block font-semibold tabular-nums">{timeFmt.format(new Date(b.starts_at))}</span>
                    <span className="block truncate">{b.caller_name}</span>
                    {rowEnd - rowStart > 2 && <span className="block truncate opacity-80">{b.title}</span>}
                  </button>
                )
              })
            })}
          </div>
        </div>
      ) : (
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
                  className={cn('min-h-24 border-b border-l border-border p-1.5 transition-colors first:border-l-0 [&:nth-child(7n+1)]:border-l-0', !inMonth && 'bg-muted/30 text-muted-foreground', d === today && 'bg-primary/10')}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAnchor(d)
                      setView('week')
                    }}
                    className={cn('mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-medium hover:bg-muted', d === today && 'bg-primary text-primary-foreground hover:bg-primary')}
                  >
                    {Number(d.slice(8))}
                  </button>
                  <div className="flex flex-col gap-0.5">
                    {items.slice(0, 3).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedId(b.id)}
                        className={cn('truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] transition-colors', STATUS_STYLES[b.status])}
                      >
                        <span className="tabular-nums">{timeFmt.format(new Date(b.starts_at))}</span> {b.caller_name}
                      </button>
                    ))}
                    {items.length > 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAnchor(d)
                          setView('week')
                        }}
                        className="px-1.5 text-left text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        {t('more', { count: items.length - 3 })}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && !error && visible.length === 0 && agents.length > 0 && (
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
        open={createOpen}
        onOpenChange={setCreateOpen}
        agents={agents}
        defaultAgentId={agentId || agents.find((a) => a.bookingEnabled)?.id || agents[0]?.id || ''}
        defaultDate={createDate ?? today}
        timezone={timezone}
        onCreated={() => {
          setCreateOpen(false)
          onChanged(null, t('created'))
        }}
      />
    </div>
  )
}
