import 'server-only'
import { formatClock } from '@/lib/calls'
import { getTwilioClient, isTwilioConfigured } from './client'

export interface CallSmsParams {
  to: string
  agentName: string
  callerNumber: string | null
  durationSeconds: number | null
  summary: string | null
  callId: string // ID záznamu v naší DB (adresa detailu hovoru)
  appUrl: string
}

const SUMMARY_MAX = 50

export function buildCallSms(p: Omit<CallSmsParams, 'to'>): string {
  const flat = (p.summary ?? '').replace(/\s+/g, ' ').trim()
  const summary = !flat ? 'No summary.' : flat.length > SUMMARY_MAX ? `${flat.slice(0, SUMMARY_MAX)}…` : flat
  const host = p.appUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return (
    `Receptio: New call from ${p.callerNumber ?? 'an unknown number'} for agent ${p.agentName}.\n` +
    `Duration: ${formatClock(p.durationSeconds)}. ${summary}\n` +
    `Detail: ${host}/dashboard/hovory/${p.callId}`
  )
}

/** Pošle SMS po hovoru. Bez Twilio klíčů nebo TWILIO_PHONE_NUMBER jen zaloguje varování. */
export async function sendCallSms(params: CallSmsParams): Promise<void> {
  const from = process.env.TWILIO_PHONE_NUMBER
  if (!isTwilioConfigured() || !from) {
    console.warn('Notifications: Twilio is not configured, skipping SMS')
    return
  }
  const { to, ...rest } = params
  await getTwilioClient().messages.create({ to, from, body: buildCallSms(rest) })
}
