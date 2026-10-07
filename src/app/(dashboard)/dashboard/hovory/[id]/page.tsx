import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentWorkspace } from '@/lib/auth'
import { getCallDetail } from '@/lib/calls-service'
import { endedReasonBadge, formatClock, formatCost, formatDateTime } from '@/lib/calls'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Call details' }

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
        href="/dashboard/hovory"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'self-start')}
      >
        <ArrowLeft /> Back to calls
      </Link>

      <div className="flex flex-col gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-semibold">
          {call.caller_number ?? 'Unknown number'}
          {call.metadata?.source === 'test' && <Badge variant="secondary">Test</Badge>}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span>{formatDateTime(call.started_at ?? call.created_at)}</span>
          <span>Duration: {formatClock(call.duration_seconds)}</span>
          <span>Agent: {call.agent_name ?? '–'}</span>
          <span>Cost: {formatCost(call)}</span>
          {call.ended_reason && (
            <Badge variant="outline" className={cn('border-transparent', reason.className)}>
              {reason.label}
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
            Play recording
          </a>
        )}
      </div>

      {call.summary && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <span className="font-semibold">Call summary: </span>
          <span className="whitespace-pre-line">{call.summary}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {messages.length > 0 ? (
            messages.map((m, i) => {
              const agent = m.role === 'assistant'
              return (
                <div key={i} className={cn('flex flex-col gap-1', agent ? 'items-end' : 'items-start')}>
                  <span className="text-xs text-muted-foreground">
                    [{formatClock(m.secondsFromStart)}] {agent ? 'Agent' : 'Customer'}
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
            <p className="text-sm text-muted-foreground">Transcript not available</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
