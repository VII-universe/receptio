import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Bot, PhoneIncoming, Sparkles, Timer, Wallet } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { CallPlayback } from '@/components/calls/call-playback'
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

      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/30" aria-hidden>
          <PhoneIncoming className="size-7" strokeWidth={1.6} />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="app-title text-2xl font-semibold tracking-tight">{call.caller_number ?? td('unknownNumber')}</h1>
            {call.metadata?.source === 'test' && <Badge variant="secondary">{td('test')}</Badge>}
            {call.ended_reason && (
              <Badge variant="outline" className={cn('border-transparent', reason.className)}>
                {reason.labelKey ? t(`reason.${reason.labelKey}`) : reason.label}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{formatDateTime(call.started_at ?? call.created_at, locale)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { Icon: Timer, text: t('durationLabel', { value: formatClock(call.duration_seconds) }) },
          { Icon: Bot, text: t('agentLabel', { value: call.agent_name ?? '–' }) },
          { Icon: Wallet, text: t('costLabel', { value: formatCost(call) }) },
        ].map(({ Icon, text }) => (
          <div key={text} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10 dark:backdrop-blur-xl">
            <Icon className="size-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
            <span className="min-w-0 truncate">{text}</span>
          </div>
        ))}
      </div>

      {call.summary && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/8 p-5 text-sm">
          <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <div className="relative flex gap-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p className="leading-relaxed">
              <span className="font-semibold">{t('summary')} </span>
              <span className="whitespace-pre-line text-foreground/90">{call.summary}</span>
            </p>
          </div>
        </div>
      )}

      <CallPlayback
        callId={call.id}
        recordingUrl={recordingOk ? call.recording_url : null}
        durationSeconds={call.duration_seconds ?? 0}
        messages={messages}
        fallbackTranscript={call.transcript ?? null}
        labels={{
          play: t('playRecording'),
          open: t('playRecording'),
          transcript: t('transcript'),
          agent: t('roleAgent'),
          customer: t('roleCustomer'),
          noTranscript: t('noTranscript'),
        }}
      />
    </div>
  )
}
