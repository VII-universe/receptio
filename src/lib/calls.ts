import type { CallLog, TranscriptMessage } from '@/types'

/** 154 -> "2 min 34 s" */
export function formatDuration(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m} min ${s % 60} s` : `${s} s`
}

/** Cena v USD; přesná hodnota z metadata.cost_usd, jinak zaokrouhlená z centů. */
export function formatCost(call: Pick<CallLog, 'cost_cents' | 'metadata'> & { cost?: number | null }): string {
  if (typeof call.cost === 'number') return `$${call.cost.toFixed(4)}`
  const exact = call.metadata?.cost_usd
  if (typeof exact === 'number') return `$${exact.toFixed(4)}`
  return `$${((call.cost_cents ?? 0) / 100).toFixed(2)}`
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/Prague',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export type Outcome = {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
}

// Důvody ukončení, které považujeme za běžný konec hovoru.
const NORMAL_END = /^(assistant-ended-call|customer-ended-call|assistant-said-end-call-phrase|assistant-ended-call-after-message-spoken|assistant-ended-call-with-hangup-task)/

export function callOutcome(call: Pick<CallLog, 'status' | 'ended_reason'>): Outcome {
  const reason = call.ended_reason ?? ''
  if (call.status === 'in_progress') return { label: 'In progress', variant: 'secondary' }
  if (call.status === 'transferred') return { label: 'Transferred', variant: 'outline' }
  if (call.status === 'failed' || /error|failed/.test(reason)) return { label: 'Chyba', variant: 'destructive' }
  if (call.status === 'missed' || (reason && !NORMAL_END.test(reason))) {
    return { label: 'Interrupted', variant: 'outline' }
  }
  return { label: 'Completed', variant: 'default' }
}

/** 154 -> "2:34" */
export function formatClock(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export interface EndedReasonBadge {
  label: string
  className: string
}

const BADGE = {
  green: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  gray: 'bg-muted text-muted-foreground',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
}

export function endedReasonBadge(reason: string | null | undefined): EndedReasonBadge {
  switch (reason) {
    case 'customer-ended-call':
      return { label: 'Customer hung up', className: BADGE.green }
    case 'assistant-ended-call':
      return { label: 'Agent hung up', className: BADGE.blue }
    case 'voicemail':
      return { label: 'Voicemail', className: BADGE.gray }
    default:
      return { label: reason ?? 'Unknown reason', className: BADGE.yellow }
  }
}

/** Hovor se počítá jako dokončený, když ho ukončil zákazník nebo agent. */
export const isCompletedReason = (reason: string | null | undefined) =>
  reason === 'customer-ended-call' || reason === 'assistant-ended-call'

/**
 * Vapi posílá repliky jako artifact.messages (role "bot"/"assistant"/"user"/"system"/"tool").
 * Necháme jen řeč; system prompt a tool volání neukládáme ani nezobrazujeme.
 */
export function compactMessages(raw: unknown): TranscriptMessage[] {
  if (!Array.isArray(raw)) return []
  const out: TranscriptMessage[] = []
  for (const m of raw) {
    if (typeof m !== 'object' || m === null) continue
    const { role, message, time, secondsFromStart } = m as Record<string, unknown>
    if (typeof message !== 'string' || !message.trim()) continue
    if (role !== 'user' && role !== 'bot' && role !== 'assistant') continue
    out.push({
      role: role === 'user' ? 'user' : 'assistant',
      message,
      time: typeof time === 'number' ? time : 0,
      secondsFromStart: typeof secondsFromStart === 'number' ? secondsFromStart : 0,
    })
  }
  return out
}
