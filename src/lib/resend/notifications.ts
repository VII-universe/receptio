import 'server-only'
import { formatDuration } from '@/lib/calls'
import { getResendClient, isResendConfigured } from './client'

export interface CallNotificationEmailParams {
  to: string
  workspaceName: string
  callerNumber: string
  duration: number // sekundy
  summary: string
  callId: string
  appUrl: string
}

// Hodnoty pocházejí z externích zdrojů (volající, AI shrnutí) – do HTML vždy escapovat.
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export function buildCallEmailHtml(p: CallNotificationEmailParams): string {
  const url = `${p.appUrl.replace(/\/$/, '')}/dashboard/calls/${encodeURIComponent(p.callId)}`
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 12px;color:#6b7280;border-bottom:1px solid #e5e7eb;white-space:nowrap;vertical-align:top">${label}</td>` +
    `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${value}</td></tr>`

  return `<!doctype html>
<html lang="cs"><body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px">
    <h1 style="margin:0 0 16px;font-size:20px">Nový hovor — ${escapeHtml(p.workspaceName)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${row('Volající', escapeHtml(p.callerNumber))}
      ${row('Délka hovoru', escapeHtml(formatDuration(p.duration)))}
      ${row('Shrnutí', p.summary ? escapeHtml(p.summary).replace(/\n/g, '<br>') : 'Shrnutí není k dispozici.')}
    </table>
    <p style="margin:24px 0 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px">Zobrazit detail hovoru</a></p>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:12px">Receptio – AI hlasový recepční</p>
</body></html>`
}

/** Pošle email po hovoru. Bez RESEND_API_KEY nedělá nic. Vyhazuje chybu, pokud Resend odmítne odeslání. */
export async function sendCallNotificationEmail(params: CallNotificationEmailParams): Promise<void> {
  if (!isResendConfigured()) return

  const { error } = await getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Receptio <notifikace@receptio.cz>',
    to: params.to,
    subject: `Nový hovor — ${params.workspaceName}`,
    html: buildCallEmailHtml(params),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}
