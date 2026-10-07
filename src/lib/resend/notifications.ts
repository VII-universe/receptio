import 'server-only'
import { endedReasonBadge, formatDuration } from '@/lib/calls'
import { getResendClient, isResendConfigured } from './client'

export interface CallEmailParams {
  to: string
  agentName: string
  callerNumber: string | null
  startedAt: string
  durationSeconds: number | null
  summary: string | null
  endedReason: string | null
  callId: string // ID záznamu v naší DB (adresa detailu hovoru)
  appUrl: string
}

// Hodnoty pocházejí z externích zdrojů (volající, AI shrnutí) – do HTML vždy escapovat.
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** "6. 10. 2026 v 14:32" (česky, časová zóna Praha) */
export function formatCzDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' })
  const time = d.toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague', hour: '2-digit', minute: '2-digit' })
  return `${date} v ${time}`
}

/** +420777123456 -> "+420 777 123 456" (ostatní čísla beze změny) */
export function formatPhone(n: string): string {
  const m = n.match(/^(\+42[01])(\d{3})(\d{3})(\d{3})$/)
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : n
}

export function buildCallEmailSubject(p: Pick<CallEmailParams, 'agentName' | 'startedAt'>): string {
  const date = new Date(p.startedAt).toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' })
  return `📞 Nový hovor – ${p.agentName.replace(/[\r\n]+/g, ' ')} – ${date}`
}

export function buildCallEmailHtml(p: CallEmailParams): string {
  const base = p.appUrl.replace(/\/$/, '')
  const callUrl = `${base}/dashboard/hovory/${encodeURIComponent(p.callId)}`
  const settingsUrl = `${base}/dashboard/nastaveni`
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#6b7280;width:100px;vertical-align:top">${label}</td><td style="padding:6px 0;color:#1a1a1a">${value}</td></tr>`

  const summary = p.summary?.trim()
  return `<!doctype html>
<html lang="cs"><body style="margin:0;padding:24px;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="padding:24px;border-bottom:1px solid #e5e7eb">
      <div style="font-size:22px;font-weight:bold;color:#3b82f6">📞 Nový hovor</div>
      <div style="margin-top:6px;font-size:14px;color:#6b7280">${escapeHtml(p.agentName)} &bull; ${escapeHtml(formatCzDateTime(p.startedAt))}</div>
    </div>
    <div style="padding:16px 24px;border-bottom:1px solid #e5e7eb;font-size:14px">
      <table style="width:100%;border-collapse:collapse">
        ${row('Volající:', escapeHtml(p.callerNumber ? formatPhone(p.callerNumber) : 'Neznámé číslo'))}
        ${row('Délka:', escapeHtml(formatDuration(p.durationSeconds)))}
        ${row('Ukončení:', escapeHtml(endedReasonBadge(p.endedReason).label))}
      </table>
    </div>
    ${
      summary
        ? `<div style="padding:16px 24px;border-bottom:1px solid #e5e7eb;font-size:14px">
      <div style="font-weight:bold;margin-bottom:6px">Shrnutí</div>
      <div style="line-height:1.5">${escapeHtml(summary).replace(/\n/g, '<br>')}</div>
    </div>`
        : ''
    }
    <div style="padding:24px;text-align:center">
      <a href="${escapeHtml(callUrl)}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:bold">Zobrazit přepis hovoru →</a>
    </div>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">Receptio &bull; <a href="${escapeHtml(settingsUrl)}" style="color:#9ca3af">Odhlásit notifikace</a></p>
</body></html>`
}

/** Pošle email po hovoru. Bez RESEND_API_KEY jen zaloguje varování. Vyhazuje chybu, pokud Resend odmítne odeslání. */
export async function sendCallEmail(params: CallEmailParams): Promise<void> {
  if (!isResendConfigured()) {
    console.warn('Notifications: RESEND_API_KEY is not set, skipping email')
    return
  }
  const { error } = await getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Receptio <notifikace@receptio.cz>',
    to: params.to,
    subject: buildCallEmailSubject(params),
    html: buildCallEmailHtml(params),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}
