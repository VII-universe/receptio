'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatClock, formatDateTime } from '@/lib/calls'
import type { AgentCallItem, AgentCallStats } from '@/lib/agents/agent-calls'
import type { CallLog } from '@/types'

type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline'
const STATUS: Record<CallLog['status'], StatusVariant> = {
  completed: 'default',
  missed: 'secondary',
  failed: 'destructive',
  transferred: 'outline',
  in_progress: 'secondary',
}

interface TranscriptState {
  loading: boolean
  error: boolean
  summary: string | null
  lines: { role: 'agent' | 'customer'; text: string }[]
  plain: string | null
}

const hhmm = (seconds: number) => {
  const m = Math.round(seconds / 60)
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

/** Záložka Hovory: souhrn za měsíc a tabulka hovorů agenta (50 na stránku, další se načtou tlačítkem). */
export function CallsTab({ agentId }: { agentId: string }) {
  const t = useTranslations('agents.callsTab')
  const locale = useLocale()
  const [calls, setCalls] = useState<AgentCallItem[] | null>(null)
  const [stats, setStats] = useState<AgentCallStats | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptState>>({})

  const load = useCallback(
    async (after: string | null) => {
      const res = await fetch(`/api/agents/${agentId}/calls${after ? `?cursor=${encodeURIComponent(after)}` : ''}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error()
      return data as { calls: AgentCallItem[]; nextCursor: string | null; stats?: AgentCallStats }
    },
    [agentId]
  )

  useEffect(() => {
    let cancelled = false
    setError(false)
    load(null)
      .then((d) => {
        if (cancelled) return
        setCalls(d.calls)
        setCursor(d.nextCursor)
        setStats(d.stats ?? null)
      })
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [load])

  async function more() {
    if (!cursor) return
    setLoadingMore(true)
    try {
      const d = await load(cursor)
      setCalls((c) => [...(c ?? []), ...d.calls])
      setCursor(d.nextCursor)
    } catch {
      setError(true)
    } finally {
      setLoadingMore(false)
    }
  }

  async function toggleTranscript(id: string) {
    if (open === id) return setOpen(null)
    setOpen(id)
    if (transcripts[id] && !transcripts[id].error) return
    setTranscripts((s) => ({ ...s, [id]: { loading: true, error: false, summary: null, lines: [], plain: null } }))
    try {
      const res = await fetch(`/api/calls/${id}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error()
      const call = data.call as CallLog
      const lines = (call.transcript_json ?? [])
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? ('agent' as const) : ('customer' as const), text: m.message }))
      setTranscripts((s) => ({ ...s, [id]: { loading: false, error: false, summary: call.summary, lines, plain: lines.length === 0 ? call.transcript : null } }))
    } catch {
      setTranscripts((s) => ({ ...s, [id]: { loading: false, error: true, summary: null, lines: [], plain: null } }))
    }
  }

  if (error && !calls) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">{t('loadFailed')}</p>
        <Button variant="outline" onClick={() => location.reload()}>
          {t('retry')}
        </Button>
      </div>
    )
  }
  if (!calls) return <Skeleton className="h-64 w-full" />

  return (
    <div className="flex flex-col gap-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label={t('monthCalls')} value={String(stats.calls)} />
          <Stat label={t('totalDuration')} value={hhmm(stats.seconds)} />
          <Stat label={t('totalCost')} value={`$${stats.costUsd.toFixed(2)}`} />
        </div>
      )}

      {calls.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t('empty')}</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('duration')}</TableHead>
                  <TableHead>{t('caller')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('cost')}</TableHead>
                  <TableHead className="text-right">{t('transcript')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((c) => {
                  const tr = transcripts[c.id]
                  return (
                    <Fragment key={c.id}>
                      <TableRow>
                        <TableCell className="whitespace-nowrap">{formatDateTime(c.startedAt ?? c.createdAt, locale)}</TableCell>
                        <TableCell className="tabular-nums">{formatClock(c.durationSeconds)}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">{c.callerMasked ?? t('unknownNumber')}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS[c.status]}>{t(`statusLabel.${c.status}`)}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">${c.costUsd.toFixed(4)}</TableCell>
                        <TableCell className="text-right">
                          {c.hasTranscript && (
                            <Button type="button" variant="ghost" size="sm" aria-expanded={open === c.id} onClick={() => toggleTranscript(c.id)}>
                              {open === c.id ? t('hide') : t('show')}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {open === c.id && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/40 whitespace-normal">
                            <Transcript state={tr} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {cursor && (
        <div>
          <Button type="button" variant="outline" onClick={more} disabled={loadingMore}>
            {loadingMore && <Loader2 className="animate-spin" />}
            {t('loadMore')}
          </Button>
        </div>
      )}
      {error && calls && <p className="text-sm text-destructive">{t('loadFailed')}</p>}
    </div>
  )

  function Transcript({ state }: { state?: TranscriptState }) {
    if (!state || state.loading) return <Skeleton className="h-16 w-full" />
    if (state.error) return <p className="text-sm text-destructive">{t('transcriptFailed')}</p>
    if (!state.summary && state.lines.length === 0 && !state.plain) return <p className="text-sm text-muted-foreground">{t('noTranscript')}</p>
    return (
      <div className="flex flex-col gap-3 py-2 text-sm">
        {state.summary && (
          <p>
            <span className="font-medium">{t('summary')}</span> {state.summary}
          </p>
        )}
        {state.lines.map((l, i) => (
          <p key={i}>
            <span className={l.role === 'agent' ? 'font-medium text-primary' : 'font-medium text-muted-foreground'}>
              {l.role === 'agent' ? t('roleAgent') : t('roleCustomer')}:
            </span>{' '}
            {l.text}
          </p>
        ))}
        {state.plain && <p className="whitespace-pre-wrap">{state.plain}</p>}
      </div>
    )
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-3xl font-semibold tabular-nums tracking-tight">{value}</span>
      </CardContent>
    </Card>
  )
}
