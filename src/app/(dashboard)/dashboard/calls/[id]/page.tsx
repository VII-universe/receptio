import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentWorkspace } from '@/lib/auth'
import {
  callOutcome,
  formatCost,
  formatDateTime,
  formatDuration,
  parseTranscript,
} from '@/lib/calls'
import { cn } from '@/lib/utils'
import { getCallLogById } from '@/lib/supabase/queries'

export const metadata = { title: 'Detail hovoru' }

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/dashboard/setup')

  const { id } = await params
  const call = await getCallLogById(workspace.id, id)
  if (!call) notFound()

  const outcome = callOutcome(call)
  const lines = parseTranscript(call.transcript)
  const recordingOk = call.recording_url?.startsWith('https://')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/dashboard/calls"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'self-start')}
      >
        <ArrowLeft /> Zpět na hovory
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">Hovor z {formatDateTime(call.created_at)}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>Volající: {call.caller_number ?? 'Neznámé'}</span>
          <span>Délka: {formatDuration(call.duration_seconds)}</span>
          <span>Náklady: {formatCost(call)}</span>
          <Badge variant={outcome.variant}>{outcome.label}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shrnutí</CardTitle>
        </CardHeader>
        <CardContent>
          {call.summary ? (
            <p className="whitespace-pre-line">{call.summary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Shrnutí zatím není k dispozici.</p>
          )}
        </CardContent>
      </Card>

      {recordingOk && (
        <Card>
          <CardHeader>
            <CardTitle>Nahrávka</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={call.recording_url!}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline' })}
            >
              Otevřít nahrávku
            </a>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Přepis hovoru</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Přepis zatím není k dispozici.</p>
          ) : (
            lines.map((l, i) => (
              <div
                key={i}
                className={cn('flex flex-col gap-1', l.role === 'user' ? 'items-end' : 'items-start')}
              >
                <span className="text-xs text-muted-foreground">
                  {l.role === 'assistant' ? 'Asistent' : l.role === 'user' ? 'Volající' : 'Přepis'}
                </span>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-sm',
                    l.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  {l.text}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
