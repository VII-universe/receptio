import 'server-only'
import { getTwilioClient, isTwilioConfigured } from './client'

export interface CallNotificationSmsParams {
  to: string
  workspaceName: string
  callerNumber: string
  duration: number // sekundy
  summary: string
}

const SUMMARY_MAX = 100

export function buildCallSms(p: Pick<CallNotificationSmsParams, 'callerNumber' | 'duration' | 'summary'>): string {
  const minutes = Math.max(1, Math.ceil(p.duration / 60))
  const flat = p.summary.replace(/\s+/g, ' ').trim()
  const summary = flat.length > SUMMARY_MAX ? `${flat.slice(0, SUMMARY_MAX)}...` : flat
  return `Receptio: Hovor od ${p.callerNumber} (${minutes} min). ${summary}`.trim().slice(0, 160)
}

/** Pošle SMS po hovoru. Bez Twilio klíčů nebo TWILIO_PHONE_NUMBER nedělá nic. */
export async function sendCallNotificationSMS(params: CallNotificationSmsParams): Promise<void> {
  const from = process.env.TWILIO_PHONE_NUMBER
  if (!isTwilioConfigured() || !from) return

  await getTwilioClient().messages.create({ to: params.to, from, body: buildCallSms(params) })
}
