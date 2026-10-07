import 'server-only'
import { createElement } from 'react'
import { CallSummaryEmail, callSummarySubject } from '@/emails/call-summary'
import { formatClock } from '@/lib/calls'
import { appBaseUrl } from '@/lib/email/format'
import { getWorkspaceEmailLocale } from '@/lib/email/get-workspace-locale'
import { sendEmail } from '@/lib/email/send'
import type { TranscriptMessage } from '@/types'

export interface SendCallSummaryInput {
  workspaceId: string
  to: string
  callId: string // ID záznamu call_logs
  agentName: string
  callerNumber: string | null
  startedAt: string
  durationSeconds: number | null
  summary: string | null
  transcript: string | null // surový přepis z Vapi ("AI: …\nUser: …")
  messages: TranscriptMessage[]
}

type Turn = { role: 'agent' | 'customer'; text: string }

/** Repliky z uložených zpráv; bez nich se pokusíme rozdělit surový přepis podle prefixů "AI:" / "User:". */
export function toTurns(messages: TranscriptMessage[], raw: string | null): Turn[] {
  if (messages.length > 0) {
    return messages.map((m) => ({ role: m.role === 'assistant' ? 'agent' : 'customer', text: m.message }))
  }
  const turns: Turn[] = []
  for (const line of (raw ?? '').split('\n')) {
    const m = line.match(/^(AI|Assistant|Bot|User|Customer):\s*(.*)$/i)
    if (m) turns.push({ role: /^(ai|assistant|bot)$/i.test(m[1]) ? 'agent' : 'customer', text: m[2] })
    else if (line.trim() && turns.length) turns[turns.length - 1].text += `\n${line.trim()}`
  }
  return turns
}

/** Pošle shrnutí hovoru v jazyce workspace. Vyhazuje chybu, pokud Resend odmítne odeslání. */
export async function sendCallSummary(input: SendCallSummaryInput): Promise<void> {
  const locale = await getWorkspaceEmailLocale(input.workspaceId)
  await sendEmail({
    to: input.to,
    subject: callSummarySubject(locale, input.agentName, input.callerNumber),
    element: createElement(CallSummaryEmail, {
      workspaceId: input.workspaceId,
      agentName: input.agentName,
      callerNumber: input.callerNumber ?? 'Unknown',
      duration: formatClock(input.durationSeconds),
      startedAt: new Date(input.startedAt),
      summary: input.summary,
      transcript: toTurns(input.messages, input.transcript),
      callId: input.callId,
      dashboardUrl: `${appBaseUrl()}/dashboard/calls/${encodeURIComponent(input.callId)}`,
      locale,
    }),
  })
}
