'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Bot, CalendarCheck, CalendarDays, Check, ChevronDown, Loader2, Phone, PhoneCall, Sparkles, StickyNote, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { addDays, localDate } from '@/lib/bookings/time'
import { cn } from '@/lib/utils'
import type { AgendaBooking } from '@/lib/bookings/stats'
import { useAgenda } from './dashboard-shell'

type Tab = 'today' | 'upcoming' | 'pending'

/**
 * Agenda rezervací na přehledu: záložky Dnes / Nadcházející / Čeká na potvrzení, pás sedmi dní s počty (klik filtruje
 * na den), seskupení po dnech, rozbalitelné řádky se všemi údaji a rychlé potvrzení či zamítnutí bez opuštění přehledu.
 */
export function BookingAgenda({ timezone }: { timezone: string }) {
  const t = useTranslations('dashboard.ov')
  const tb = useTranslations('dashboard.bookings')
  const locale = useLocale()
  const router = useRouter()
  const today = localDate(new Date(), timezone)
  const { items, setItems, day, setDay } = useAgenda() // sdílí se s přehledem dne pod grafem
  const [tab, setTab] = useState<Tab>(() => (items.some((b) => b.status === 'pending') ? 'pending' : 'upcoming'))
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const dayOf = (iso: string) => localDate(new Date(iso), timezone)
  const clock = useMemo(() => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: timezone }), [locale, timezone])
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }), [locale])
  const wk = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }), [locale])

  const pendingCount = items.filter((b) => b.status === 'pending').length
  const todayCount = items.filter((b) => dayOf(b.startsAt) === today).length
  const strip = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const countOn = (d: string) => items.filter((b) => dayOf(b.startsAt) === d).length

  const visible = items.filter((b) => (day ? dayOf(b.startsAt) === day : tab === 'today' ? dayOf(b.startsAt) === today : tab === 'pending' ? b.status === 'pending' : true))
  const groups = useMemo(() => {
    const map = new Map<string, AgendaBooking[]>()
    for (const b of visible) map.set(dayOf(b.startsAt), [...(map.get(dayOf(b.startsAt)) ?? []), b])
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map((b) => b.id).join(',')])

  const heading = (d: string) => (d === today ? t('today') : d === addDays(today, 1) ? t('tomorrow') : dayFmt.format(new Date(`${d}T12:00:00Z`)))

  async function setStatus(b: AgendaBooking, status: 'confirmed' | 'cancelled') {
    setBusy(b.id)
    try {
      const res = await fetch(`/api/bookings/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      if (!res.ok) throw new Error()
      setItems((list) => (status === 'cancelled' ? list.filter((x) => x.id !== b.id) : list.map((x) => (x.id === b.id ? { ...x, status: 'confirmed' } : x))))
      toast.add({ type: 'success', title: status === 'confirmed' ? tb('confirmed') : tb('declined') })
      router.refresh() // přepočítá čísla v dlaždicích a upozornění
    } catch {
      toast.add({ type: 'error', title: tb('failed') })
    } finally {
      setBusy(null)
    }
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'today', label: t('today'), count: todayCount },
    { id: 'upcoming', label: t('upcoming'), count: items.length },
    { id: 'pending', label: t('pendingTab'), count: pendingCount },
  ]

  return (
    <div className="flex h-full flex-col rounded-2xl bg-card ring-1 ring-foreground/10 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] dark:backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3 px-5 pt-5">
        <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/20" aria-hidden>
            <CalendarCheck className="size-4" strokeWidth={1.75} />
          </span>
          {t('agenda')}
        </h2>
        <Link href="/dashboard/calendar" className="ml-auto text-sm font-medium text-primary hover:underline">
          {tb('openCalendar')}
        </Link>
      </div>

      {/* pás sedmi dní: počet rezervací, klik filtruje seznam na den */}
      <div className="grid grid-cols-7 gap-1.5 px-5 pt-4" role="group" aria-label={t('weekStrip')}>
        {strip.map((d) => {
          const n = countOn(d)
          const selected = day === d
          return (
            <button
              key={d}
              type="button"
              aria-pressed={selected}
              onClick={() => setDay(selected ? null : d)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-xs transition-colors',
                selected ? 'border-primary/50 bg-primary/15' : 'border-border bg-muted/40 hover:bg-muted',
                d === today && !selected && 'border-primary/30'
              )}
            >
              <span className="uppercase tracking-wide text-muted-foreground">{wk.format(new Date(`${d}T12:00:00Z`))}</span>
              <span className="text-sm font-semibold tabular-nums">{Number(d.slice(8))}</span>
              <span className={cn('flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums', n > 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground/60')}>{n > 0 ? n : '·'}</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-1 border-b border-border px-5 pt-3" role="tablist">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={!day && tab === x.id}
            onClick={() => {
              setTab(x.id)
              setDay(null)
            }}
            className={cn('-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors', !day && tab === x.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            {x.label}
            <span className={cn('rounded-full px-1.5 text-[11px] font-semibold tabular-nums', x.id === 'pending' && x.count > 0 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-muted text-muted-foreground')}>{x.count}</span>
          </button>
        ))}
        {day && (
          <button type="button" onClick={() => setDay(null)} className="ml-auto mb-1.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-3" aria-hidden /> {t('clearDay')}
          </button>
        )}
      </div>

      <div className="max-h-[28rem] flex-1 overflow-y-auto px-3 py-3">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground" aria-hidden>
              <CalendarDays className="size-6" strokeWidth={1.5} />
            </span>
            <p className="max-w-xs text-sm text-muted-foreground">{tab === 'pending' && !day ? t('nonePending') : items.length === 0 ? tb('none') : t('noneOnDay')}</p>
            {items.length === 0 && (
              <Link href="/dashboard/agents" className="text-sm font-medium text-primary hover:underline">
                {tb('enable')}
              </Link>
            )}
          </div>
        ) : (
          groups.map(([d, list]) => (
            <div key={d} className="mb-3 last:mb-0">
              <h3 className="sticky top-0 z-[1] bg-card/95 px-2 py-1 text-xs font-semibold capitalize text-muted-foreground backdrop-blur">{heading(d)}</h3>
              <ul className="flex flex-col gap-1.5">
                {list.map((b) => {
                  const expanded = open === b.id
                  const pending = b.status === 'pending'
                  return (
                    <li key={b.id} className={cn('overflow-hidden rounded-xl border transition-colors', pending ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-muted/30', expanded && 'bg-muted/60')}>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                        <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : b.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md">
                          <span className="w-[4.5rem] shrink-0">
                            <span className="block text-sm font-semibold tabular-nums">{clock.format(new Date(b.startsAt))}</span>
                            <span className="block text-[11px] tabular-nums text-muted-foreground">– {clock.format(new Date(b.endsAt))}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-sm font-medium">
                              <span className="truncate">{b.callerName}</span>
                              {b.callLogId && <Sparkles className="size-3.5 shrink-0 text-primary" aria-label={tb('bookedByAi')} />}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">{b.title}</span>
                          </span>
                          <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} aria-hidden />
                        </button>
                        {pending ? (
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" disabled={busy === b.id} onClick={() => setStatus(b, 'confirmed')}>
                              {busy === b.id ? <Loader2 className="animate-spin" /> : <Check />} {tb('confirm')}
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy === b.id} onClick={() => setStatus(b, 'cancelled')} aria-label={tb('decline')}>
                              <X />
                              <span className="hidden sm:inline">{tb('decline')}</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                            <Check className="size-3" aria-hidden /> {t('statusConfirmed')}
                          </span>
                        )}
                      </div>
                      {expanded && (
                        <dl className="grid gap-2 border-t border-border/70 px-3 py-3 text-xs sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <Bot className="size-3.5 text-primary" aria-hidden />
                            <dd>{b.agentName}</dd>
                          </div>
                          {b.callerPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="size-3.5 text-primary" aria-hidden />
                              <dd>
                                <a href={`tel:${b.callerPhone}`} className="hover:underline">
                                  {b.callerPhone}
                                </a>
                              </dd>
                            </div>
                          )}
                          {b.notes && (
                            <div className="flex items-start gap-2 sm:col-span-2">
                              <StickyNote className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                              <dd className="whitespace-pre-line">{b.notes}</dd>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                            <Link href={`/dashboard/calendar?date=${dayOf(b.startsAt)}`} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                              <CalendarDays className="size-3.5" aria-hidden /> {t('openDay')}
                            </Link>
                            {b.callLogId && (
                              <Link href={`/dashboard/calls/${b.callLogId}`} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                                <PhoneCall className="size-3.5" aria-hidden /> {t('openCall')}
                              </Link>
                            )}
                          </div>
                        </dl>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
