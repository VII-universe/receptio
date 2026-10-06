import type { CallLog } from '@/types'

/** 154 -> "2 min 34 s" */
export function formatDuration(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m} min ${s % 60} s` : `${s} s`
}

/** Cena v USD; přesná hodnota z metadata.cost_usd, jinak zaokrouhlená z centů. */
export function formatCost(call: Pick<CallLog, 'cost_cents' | 'metadata'>): string {
  const exact = call.metadata?.cost_usd
  if (typeof exact === 'number') return `$${exact.toFixed(4)}`
  return `$${((call.cost_cents ?? 0) / 100).toFixed(2)}`
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('cs-CZ', {
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
  if (call.status === 'in_progress') return { label: 'Probíhá', variant: 'secondary' }
  if (call.status === 'transferred') return { label: 'Přepojen', variant: 'outline' }
  if (call.status === 'failed' || /error|failed/.test(reason)) return { label: 'Chyba', variant: 'destructive' }
  if (call.status === 'missed' || (reason && !NORMAL_END.test(reason))) {
    return { label: 'Přerušen', variant: 'outline' }
  }
  return { label: 'Dokončen', variant: 'default' }
}

export interface TranscriptLine {
  role: 'assistant' | 'user' | 'unknown'
  text: string
}

/** Vapi ukládá přepis jako text "AI: ...\nUser: ..."; rozdělí ho na repliky. */
export function parseTranscript(transcript: string | null): TranscriptLine[] {
  if (!transcript) return []
  const lines: TranscriptLine[] = []
  for (const raw of transcript.split('\n')) {
    const m = raw.match(/^(AI|Assistant|User|Customer):\s*(.*)$/i)
    if (m) {
      lines.push({ role: /^(ai|assistant)$/i.test(m[1]) ? 'assistant' : 'user', text: m[2] })
    } else if (raw.trim()) {
      if (lines.length > 0) lines[lines.length - 1].text += `\n${raw}`
      else lines.push({ role: 'unknown', text: raw })
    }
  }
  return lines
}
