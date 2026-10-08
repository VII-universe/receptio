'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarClock, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addDays, fromMinutes, localDate, localParts } from '@/lib/bookings/time'
import { cn } from '@/lib/utils'
import { useAgenda } from './dashboard-shell'

const DEFAULT_FROM = 7
const DEFAULT_TO = 20
const MAX_AHEAD = 13 // agenda načítá 14 dní dopředu
const MIN_LENGTHS = [15, 30, 60] as const

interface Interval {
  start: number
  end: number
}

const minutesOf = (iso: string, tz: string) => {
  const p = localParts(new Date(iso), tz)
  return p.hour * 60 + p.minute
}

/** 45 -> "45 min", 75 -> "1 h 15 min" */
const duration = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`)

/**
 * Vybraný den v kostce: časová osa přes celý den (rezervace jako bloky, volné kapsy zeleně, značka "teď")
 * a pod ní nabídka volného času, kam se dá vměstnat další práce. Seznam rezervací tu záměrně není (je v agendě vedle).
 * Den se mění klikem na pás dní v agendě, šipkami nebo tlačítkem Dnes. Klik na kapsu otevře kalendář s předvyplněnou rezervací.
 */
export function TodayOverview({ timezone }: { timezone: string }) {
  const t = useTranslations('dashboard.ov')
  const locale = useLocale()
  const { items, day, setDay, available, agentId } = useAgenda()
  const [now, setNow] = useState<Date | null>(null)
  const [free, setFree] = useState<{ intervals: Interval[]; configured: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [minLen, setMinLen] = useState<(typeof MIN_LENGTHS)[number]>(15)

  // Aktuální čas jen v prohlížeči (na serveru by se lišil a hydratace by hlásila nesoulad); značka "teď" se po minutě posune.
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const today = localDate(now ?? new Date(), timezone)
  const shown = day ?? today
  const offset = Math.round((new Date(`${shown}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86_400_000)
  const list = items.filter((b) => localDate(new Date(b.startsAt), timezone) === shown)
  // Podpis rezervací dne: po potvrzení / zrušení / změně se volný čas přepočítá.
  const signature = list.map((b) => `${b.id}:${b.startsAt}:${b.endsAt}`).join(',')

  useEffect(() => {
    if (!available) return
    let cancelled = false
    setLoading(true)
    setFailed(false)
    const q = new URLSearchParams({ date: shown })
    if (agentId) q.set('agent_id', agentId)
    fetch(`/api/calendar/free-time?${q}`)
      .then(async (res) => {
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!cancelled) setFree(data)
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [shown, agentId, signature, available])

  const clock = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: timezone })
  const dayTitle = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${shown}T12:00:00Z`))
  const pockets = (free?.intervals ?? []).filter((i) => i.end - i.start >= minLen)
  const totalFree = pockets.reduce((s, i) => s + (i.end - i.start), 0)
  const longest = pockets.reduce((m, i) => Math.max(m, i.end - i.start), 0)

  // Osa se roztáhne tak, aby se vešly rezervace i volné úseky vybraného dne.
  let from = DEFAULT_FROM
  let to = DEFAULT_TO
  for (const b of list) {
    from = Math.min(from, Math.floor(minutesOf(b.startsAt, timezone) / 60))
    const e = minutesOf(b.endsAt, timezone)
    to = Math.max(to, Math.ceil((e === 0 ? 1440 : e) / 60))
  }
  for (const i of free?.intervals ?? []) {
    from = Math.min(from, Math.floor(i.start / 60))
    to = Math.max(to, Math.ceil(i.end / 60))
  }
  from = Math.max(0, from)
  to = Math.min(24, to)
  const span = (to - from) * 60
  const pct = (min: number) => Math.max(0, Math.min(100, ((min - from * 60) / span) * 100))
  const nowMin = now ? minutesOf(now.toISOString(), timezone) : -1
  const showNow = shown === today && nowMin >= from * 60 && nowMin <= to * 60
  const heading = offset === 0 ? t('todayTitle') : offset === 1 ? t('tomorrow') : null
  const agentsLink = agentId ? `/dashboard/agents/${agentId}?tab=dostupnost` : '/dashboard/agents'

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4 shrink-0 text-primary" aria-hidden />
          {heading && <span>{heading}</span>}
          <span className={cn('truncate capitalize', heading && 'font-normal text-muted-foreground')}>{heading ? `· ${dayTitle}` : dayTitle}</span>
        </h3>
        {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />}
        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" disabled={offset <= 0} aria-label={t('prevDay')} onClick={() => setDay(offset - 1 <= 0 ? null : addDays(today, offset - 1))}>
            <ChevronLeft />
          </Button>
          {offset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setDay(null)}>
              {t('today')}
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" disabled={offset >= MAX_AHEAD} aria-label={t('nextDay')} onClick={() => setDay(addDays(today, offset + 1))}>
            <ChevronRight />
          </Button>
          <Link href={`/dashboard/calendar?date=${shown}`} className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <CalendarDays className="size-3.5" aria-hidden /> <span className="hidden sm:inline">{t('openDay')}</span>
          </Link>
        </div>
      </div>

      {!available ? (
        <p className="text-xs text-muted-foreground">{t('todayUnavailable')}</p>
      ) : (
        <>
          <div>
            <div className="relative h-7 overflow-hidden rounded-lg border border-border bg-muted/40" role="img" aria-label={t('todayTimeline', { count: list.length })}>
              {Array.from({ length: to - from - 1 }, (_, i) => (
                <span key={i} className="absolute inset-y-0 w-px bg-border/70" style={{ left: `${((i + 1) / (to - from)) * 100}%` }} aria-hidden />
              ))}
              {(free?.intervals ?? []).map((i) => (
                <span
                  key={`f${i.start}`}
                  title={`${t('free')}: ${fromMinutes(i.start)}–${fromMinutes(i.end % 1440)} (${duration(i.end - i.start)})`}
                  className={cn('absolute inset-y-1 rounded-[5px] border border-emerald-500/40 bg-emerald-500/20 transition-opacity', i.end - i.start < minLen && 'opacity-40')}
                  style={{ left: `${pct(i.start)}%`, width: `max(${Math.max(pct(i.end) - pct(i.start), 0)}%, 4px)` }}
                />
              ))}
              {list.map((b) => {
                const s = pct(minutesOf(b.startsAt, timezone))
                const eMin = minutesOf(b.endsAt, timezone)
                const e = pct(eMin === 0 ? 1440 : eMin)
                return (
                  <span
                    key={b.id}
                    title={`${clock.format(new Date(b.startsAt))}–${clock.format(new Date(b.endsAt))} · ${b.callerName}`}
                    className={cn('absolute inset-y-1 rounded-[5px] border', b.status === 'pending' ? 'border-dashed border-amber-500 bg-amber-500/30' : 'border-primary/40 bg-primary/70')}
                    style={{ left: `${s}%`, width: `max(${Math.max(e - s, 0)}%, 6px)` }}
                  />
                )
              })}
              {showNow && <span className="absolute inset-y-0 z-10 w-0.5 bg-red-500" style={{ left: `${pct(nowMin)}%` }} aria-hidden />}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-[10px] tabular-nums text-muted-foreground">
              <span aria-hidden>{String(from).padStart(2, '0')}:00</span>
              <span className="flex items-center gap-3" aria-hidden>
                <span className="flex items-center gap-1"><span className="size-2 rounded-[3px] bg-primary/70" />{t('legendBooked')}</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-[3px] border border-dashed border-amber-500 bg-amber-500/30" />{t('legendPending')}</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-[3px] border border-emerald-500/40 bg-emerald-500/20" />{t('free')}</span>
              </span>
              <span aria-hidden>{String(to).padStart(2, '0')}:00</span>
            </div>
          </div>

          {/* nabídka volného času: kam se dá vměstnat další práce */}
          {failed ? (
            <p className="text-xs text-destructive">{t('freeFailed')}</p>
          ) : free && !free.configured ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
              {t('freeNotConfigured')}{' '}
              <Link href={agentsLink} className="font-medium text-primary hover:underline">
                {t('freeConfigure')}
              </Link>
            </p>
          ) : (
            <div className={cn('flex min-h-0 flex-1 flex-col gap-2 transition-opacity', loading && 'opacity-60')}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                <span className="font-semibold">
                  {pockets.length > 0 ? t('freeSummary', { total: duration(totalFree), count: pockets.length }) : t('freeNone')}
                </span>
                {longest > 0 && <span className="text-muted-foreground">{t('freeLongest', { value: duration(longest) })}</span>}
                <div role="group" aria-label={t('freeMin')} className="ml-auto flex rounded-md bg-muted p-0.5">
                  {MIN_LENGTHS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={minLen === m}
                      onClick={() => setMinLen(m)}
                      className={cn('rounded px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors', minLen === m ? 'bg-background shadow-sm ring-1 ring-primary/30' : 'text-muted-foreground hover:text-foreground')}
                    >
                      ≥ {m} min
                    </button>
                  ))}
                </div>
              </div>
              {pockets.length > 0 && (
                <ul className="-mr-1 grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] content-start gap-1.5 overflow-y-auto pr-1">
                  {pockets.map((i) => (
                    <li key={i.start}>
                      <Link
                        href={`/dashboard/calendar?date=${shown}&new=${fromMinutes(i.start)}&dur=${Math.min(i.end - i.start, 120)}`}
                        title={t('freeBook')}
                        className="group flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/20"
                      >
                        <span className="font-semibold tabular-nums">
                          {fromMinutes(i.start)}–{fromMinutes(i.end % 1440)}
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-1.5 text-[10px] font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">{duration(i.end - i.start)}</span>
                        <CalendarPlus className="ml-auto size-3.5 text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100 dark:text-emerald-300" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
