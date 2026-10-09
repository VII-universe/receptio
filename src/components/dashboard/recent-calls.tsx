import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { CalendarCheck, PhoneCall } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CardIcon } from '@/components/ui/card'
import { endedReasonBadge, formatClock } from '@/lib/calls'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCallLogsPage } from '@/lib/supabase/queries'
import { cn } from '@/lib/utils'

/** Poslední hovory: kdo volal, jak dopadl, krátké shrnutí a odznak, když z hovoru vznikla rezervace. */
export async function RecentCalls({ workspaceId, timezone, agentId }: { workspaceId: string; timezone: string; agentId?: string }) {
  const t = await getTranslations('dashboard')
  const to = await getTranslations('dashboard.ov')
  const tc = await getTranslations('calls')
  const locale = await getLocale()
  const { calls } = await getCallLogsPage(workspaceId, { page: 1, limit: 6, agentId })

  const booked = new Set<string>()
  if (calls.length > 0) {
    const { data } = await createAdminClient().from('bookings').select('call_log_id').in('call_log_id', calls.map((c) => c.id)).not('status', 'in', '(cancelled,no_show)')
    for (const b of data ?? []) if (b.call_log_id) booked.add(b.call_log_id)
  }
  const when = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: timezone })

  return (
    <div className="flex h-full flex-col rounded-2xl bg-card ring-1 ring-foreground/10 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] dark:backdrop-blur-xl">
      <div className="flex items-center gap-2.5 px-5 pt-5">
        <CardIcon icon={PhoneCall} />
        <h2 className="text-base font-semibold tracking-tight">{t('recentCalls')}</h2>
        <Link href="/dashboard/calls" className="ml-auto text-sm font-medium text-primary hover:underline">
          {t('viewAll')}
        </Link>
      </div>
      {calls.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t('emptyText')}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 p-3">
          {calls.map((c) => {
            const reason = endedReasonBadge(c.ended_reason)
            return (
              <li key={c.id}>
                <Link href={`/dashboard/calls/${c.id}`} className="group flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/60">
                  <span className="w-24 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{when.format(new Date(c.started_at ?? c.created_at))}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {c.caller_number ?? t('unknownNumber')}
                      <span className="text-xs font-normal text-muted-foreground">
                        {formatClock(c.duration_seconds)} · {c.agent_name ?? '–'}
                      </span>
                      {c.metadata?.source === 'test' && <Badge variant="secondary">{t('test')}</Badge>}
                    </span>
                    {c.summary && <span className="line-clamp-1 block text-xs text-muted-foreground">{c.summary}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {booked.has(c.id) && (
                      <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                        <CalendarCheck className="size-3" aria-hidden /> {to('booked')}
                      </Badge>
                    )}
                    <Badge variant="outline" className={cn('border-transparent', reason.className)}>
                      {reason.labelKey ? tc(`reason.${reason.labelKey}`) : reason.label}
                    </Badge>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
