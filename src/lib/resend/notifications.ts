import 'server-only'
import { createElement } from 'react'
import { CallNotificationEmail } from '@/emails/call-notification'
import { sendEmail } from '@/lib/email/send'

export interface CallEmailParams {
  to: string
  businessName: string
  agentName: string
  callerNumber: string | null
  startedAt: string
  durationSeconds: number | null
  summary: string | null
  transcript: string | null
  callId: string // ID záznamu v naší DB (adresa detailu hovoru)
  appUrl: string
}

export function buildCallEmailSubject(p: Pick<CallEmailParams, 'agentName' | 'startedAt'>): string {
  const date = new Date(p.startedAt).toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' })
  return `📞 Nový hovor – ${p.agentName} – ${date}`
}

/** Pošle email o hovoru (React Email šablona). Vyhazuje chybu, pokud Resend odmítne odeslání. */
export async function sendCallEmail(p: CallEmailParams): Promise<void> {
  await sendEmail({
    to: p.to,
    subject: buildCallEmailSubject(p),
    element: createElement(CallNotificationEmail, {
      agentName: p.agentName,
      callerNumber: p.callerNumber ?? 'Neznámé číslo',
      duration: p.durationSeconds ?? 0,
      startedAt: p.startedAt,
      summary: p.summary ?? undefined,
      transcript: p.transcript ?? undefined,
      callId: p.callId,
      businessName: p.businessName,
      appUrl: p.appUrl,
    }),
  })
}
