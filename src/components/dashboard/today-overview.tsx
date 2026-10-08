'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addDays, localDate, localParts } from '@/lib/bookings/time'
import { cn } from '@/lib/utils'
import { useAgenda } from './dashboard-shell'

const DEFAULT_FROM = 7
const DEFAULT_TO = 20
const MAX_AHEAD = 13 // agenda načítá 14 dní dopředu

const minutesOf = (iso: string, tz: string) => {
  const p = localParts(new Date(iso), tz)
  return p.hour * 60 + p.minute
}

/**
 * Vybraný den v kostce (výchozí je dnešek): časová osa přes celý den, rezervace jako bloky, značka "teď" a pod ní seznam.
 * Den se mění klikem na pás dní v agendě, šipkami v hlavičce, nebo tlačítkem Dnes. Čekající rezervace mají přerušovaný
 * okraj a štítek, takže stav nerozlišuje jen barva.
 */
export function TodayOverview({ timezone }: { timezone: string }) {
  const t = useTranslations('dashboard.ov')
  const locale = useLocale()
  const { items, day, setDay, available } = useAgenda()
  const [now, setNow] = useState<Date | null>(null)

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
  const clock = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: timezone })
  const dayTitle = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${shown}T12:00:00Z`))

  // Osa se roztáhne tak, aby se vešly všechny rezervace vybraného dne.
  let from = DEFAULT_FROM
  let to = DEFAULT_TO
  for (const b of list) {
    from = Math.min(from, Math.floor(minutesOf(b.startsAt, timezone) / 60))
    const e = minutesOf(b.endsAt, timezone)
    to = Math.max(to, Math.ceil((e === 0 ? 1440 : e) / 60))
  }
  from = Math.max(0, from)
  to = Math.min(24, to)
  const span = (to - from) * 60
  const pct = (min: number) => Math.max(0, Math.min(100, ((min - from * 60) / span) * 100))
  const nowMin = now ? minutesOf(now.toISOString(), timezone) : -1
  const showNow = shown === today && nowMin >= from * 60 && nowMin <= to * 60

  const heading = offset === 0 ? t('todayTitle') : offset === 1 ? t('tomorrow') : null

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-3')}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4 shrink-0 text-primary" aria-hidden />
          {heading && <span>{heading}</span>}
          <span className={cn('truncate capitalize', heading ? 'font-normal text-muted-foreground' : '')}>{heading ? `· ${dayTitle}` : dayTitle}</span>
        </h3>
        <span className="rounded-full bg-muted px-2 text-xs font-semibold tabular-nums text-muted-foreground" aria-label={t('todayTimeline', { count: list.length })}>
          {list.length}
        </span>
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
              {list.map((b) => {
                const s = pct(minutesOf(b.startsAt, timezone))
                const eMin = minutesOf(b.endsAt, timezone)
                const e = pct(eMin === 0 ? 1440 : eMin)
                return (
                  <span
                    key={b.id}
                    title={`${clock.format(new Date(b.startsAt))}–${clock.format(new Date(b.endsAt))} · ${b.callerName}`}
                    className={cn('absolute inset-y-1 rounded-[5px] border transition-all', b.status === 'pending' ? 'border-dashed border-amber-500 bg-amber-500/25' : 'border-primary/40 bg-primary/70')}
                    style={{ left: `${s}%`, width: `max(${Math.max(e - s, 0)}%, 6px)` }}
                  />
                )
              })}
              {showNow && <span className="absolute inset-y-0 z-10 w-0.5 bg-red-500" style={{ left: `${pct(nowMin)}%` }} aria-hidden />}
            </div>
            <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground" aria-hidden>
              <span>{String(from).padStart(2, '0')}:00</span>
              <span>{String(Math.round((from + to) / 2)).padStart(2, '0')}:00</span>
              <span>{String(to).padStart(2, '0')}:00</span>
            </div>
          </div>

          {list.length === 0 ? (
            <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">{offset === 0 ? t('todayNone') : t('dayNone')}</p>
          ) : (
            <ul className="-mr-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
              {list.map((b) => (
                <li key={b.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-muted/60">
                  <span className="w-[5.5rem] shrink-0 font-semibold tabular-nums">
                    {clock.format(new Date(b.startsAt))}–{clock.format(new Date(b.endsAt))}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{b.callerName}</span> <span className="text-muted-foreground">· {b.title}</span>
                  </span>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', b.status === 'pending' ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300')}>
                    {b.status === 'pending' ? t('pendingTab') : t('statusConfirmed')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
