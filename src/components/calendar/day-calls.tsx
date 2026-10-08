'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarCheck, ChevronDown, PhoneCall } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { endedReasonBadge, formatClock } from '@/lib/calls'
import { cn } from '@/lib/utils'
import type { Booking, TranscriptMessage } from '@/types'

interface DayCall {
  id: string
  agent_name: string | null
  caller_number: string | null
  duration_seconds: number
  summary: string | null
  ended_reason: string | null
  created_at: string
  started_at: string | null
  metadata: Record<string, unknown> | null
  messages: TranscriptMessage[]
}

const PREVIEW_MESSAGES = 6

/** Hovory vybraného dne s náhledem přepisu (rozbalí se klikem) a vazbou na rezervace, které při nich vznikly. */
export function DayCalls({ date, agentId, timezone, bookings }: { date: string; agentId: string; timezone: string; bookings: Booking[] }) {
  const t = useTranslations('calendar')
  const tc = useTranslations('calls')
  const td = useTranslations('dashboard')
  const locale = useLocale()
  const [calls, setCalls] = useState<DayCall[] | null>(null)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [full, setFull] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    setCalls(null)
    setError(false)
    setOpen(null)
    const q = new URLSearchParams({ date })
    if (agentId) q.set('agent_id', agentId)
    fetch(`/api/calls/by-day?${q}`)
      .then(async (res) => {
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!cancelled) setCalls(data.calls)
      })
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [date, agentId])

  const clock = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: timezone })

  return (
    <section className="flex flex-col gap-3" aria-label={t('dayCalls')}>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <PhoneCall className="size-4 text-primary" aria-hidden /> {t('dayCalls')}
        {calls && <span className="font-normal text-muted-foreground">({calls.length})</span>}
      </h3>
      {error ? (
        <p className="text-sm text-destructive">{t('loadFailed')}</p>
      ) : !calls ? (
        <Skeleton className="h-28 rounded-xl" />
      ) : calls.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t('noCallsDay')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {calls.map((c) => {
            const reason = endedReasonBadge(c.ended_reason)
            const isOpen = open === c.id
            const showAll = full.has(c.id)
            const msgs = showAll ? c.messages : c.messages.slice(0, PREVIEW_MESSAGES)
            const booked = bookings.filter((b) => b.call_log_id === c.id)
            return (
              <li key={c.id} className="overflow-hidden rounded-xl border border-border bg-muted/40">
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)} className="flex w-full items-start gap-3 p-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset">
                  <span className="mt-0.5 w-11 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{clock.format(new Date(c.started_at ?? c.created_at))}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {c.caller_number ?? td('unknownNumber')}
                      <span className="text-xs font-normal text-muted-foreground">{formatClock(c.duration_seconds)}</span>
                      {c.metadata?.source === 'test' && <Badge variant="secondary">{td('test')}</Badge>}
                    </span>
                    {c.summary && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{c.summary}</span>}
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn('border-transparent', reason.className)}>
                        {reason.labelKey ? tc(`reason.${reason.labelKey}`) : reason.label}
                      </Badge>
                      {booked.map((b) => (
                        <Badge key={b.id} variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-300">
                          <CalendarCheck className="size-3" aria-hidden /> {clock.format(new Date(b.starts_at))}
                        </Badge>
                      ))}
                    </span>
                  </span>
                  <ChevronDown className={cn('mt-1 size-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} aria-hidden />
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-2 border-t border-border bg-background/40 p-3">
                    {c.messages.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{tc('noTranscript')}</p>
                    ) : (
                      msgs.map((m, i) => {
                        const agent = m.role === 'assistant'
                        return (
                          <div key={i} className={cn('flex flex-col gap-0.5', agent ? 'items-end' : 'items-start')}>
                            <span className="text-[10px] text-muted-foreground">
                              {formatClock(m.secondsFromStart)} · {agent ? tc('roleAgent') : tc('roleCustomer')}
                            </span>
                            <div className={cn('max-w-[90%] whitespace-pre-line rounded-xl px-3 py-1.5 text-xs', agent ? 'bg-primary text-primary-foreground' : 'bg-muted')}>{m.message}</div>
                          </div>
                        )
                      })
                    )}
                    {c.messages.length > PREVIEW_MESSAGES && !showAll && (
                      <button type="button" className="self-start text-xs font-medium text-primary hover:underline" onClick={() => setFull(new Set(full).add(c.id))}>
                        {t('showFullTranscript', { count: c.messages.length - PREVIEW_MESSAGES })}
                      </button>
                    )}
                    <Link href={`/dashboard/calls/${c.id}`} className="self-start text-xs font-medium text-primary hover:underline">
                      {t('openCall')}
                    </Link>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
