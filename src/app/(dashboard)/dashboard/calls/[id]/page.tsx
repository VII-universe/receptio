import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentWorkspace } from '@/lib/auth'
import { getCallDetail } from '@/lib/calls-service'
import { endedReasonBadge, formatClock, formatCost, formatDateTime } from '@/lib/calls'
import { cn } from '@/lib/utils'

export async function generateMetadata() {
  return { title: (await getTranslations('calls'))('detailTitle') }
}

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations('calls')
  const td = await getTranslations('dashboard')
  const locale = await getLocale()
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/onboarding')

  const call = await getCallDetail(workspace.id, (await params).id)
  if (!call) notFound()

  const reason = endedReasonBadge(call.ended_reason)
  const messages = call.transcript_json ?? []
  // Odkaz bereme jen pokud je to https URL.
  const recordingOk = call.recording_url?.startsWith('https://')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/dashboard/calls"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'self-start')}
      >
        <ArrowLeft /> {t('back')}
      </Link>

      <div className="flex flex-col gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-semibold">
          {call.caller_number ?? td('unknownNumber')}
          {call.metadata?.source === 'test' && <Badge variant="secondary">{td('test')}</Badge>}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span>{formatDateTime(call.started_at ?? call.created_at, locale)}</span>
          <span>{t('durationLabel', { value: formatClock(call.duration_seconds) })}</span>
          <span>{t('agentLabel', { value: call.agent_name ?? '–' })}</span>
          <span>{t('costLabel', { value: formatCost(call) })}</span>
          {call.ended_reason && (
            <Badge variant="outline" className={cn('border-transparent', reason.className)}>
              {reason.labelKey ? t(`reason.${reason.labelKey}`) : reason.label}
            </Badge>
          )}
        </div>
        {recordingOk && (
          <a
            href={call.recording_url!}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'self-start')}
          >
            {t('playRecording')}
          </a>
        )}
      </div>

      {call.summary && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <span className="font-semibold">{t('summary')} </span>
          <span className="whitespace-pre-line">{call.summary}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('transcript')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {messages.length > 0 ? (
            messages.map((m, i) => {
              const agent = m.role === 'assistant'
              return (
                <div key={i} className={cn('flex flex-col gap-1', agent ? 'items-end' : 'items-start')}>
                  <span className="text-xs text-muted-foreground">
                    [{formatClock(m.secondsFromStart)}] {agent ? t('roleAgent') : t('roleCustomer')}
                  </span>
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-sm',
                      agent ? 'bg-blue-600 text-white' : 'bg-muted'
                    )}
                  >
                    {m.message}
                  </div>
                </div>
              )
            })
          ) : call.transcript ? (
            <pre className="whitespace-pre-wrap font-sans text-sm">{call.transcript}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noTranscript')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
