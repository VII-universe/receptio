import 'server-only'
import { sendCallSummary } from '@/lib/email/send-call-summary'
import { getOwnerContact } from '@/lib/email/recipients'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendCallSms } from '@/lib/twilio/notifications'
import type { TranscriptMessage } from '@/types'

export interface CallNotificationData {
  workspaceId: string
  callId: string // ID záznamu call_logs (adresa detailu hovoru)
  agentName: string
  callerNumber: string | null
  startedAt: string
  durationSeconds: number | null
  summary: string | null
  transcript: string | null
  messages?: TranscriptMessage[] // repliky hovoru (transcript_json); bez nich se přepis rozparsuje z textu
  endedReason: string | null
}

/**
 * Pošle shrnutí hovoru emailem a/nebo SMS podle nastavení workspace.
 * Chyby se logují, nevyhazují se (notifikace nesmí shodit webhook).
 */
export async function sendCallNotification(data: CallNotificationData): Promise<void> {
  try {
    const { data: ws, error } = await createAdminClient()
      .from('workspaces')
      .select('name, clerk_user_id, notification_email, notification_phone, notifications_enabled')
      .eq('id', data.workspaceId)
      .maybeSingle()
    if (error) throw error
    if (!ws || !ws.notifications_enabled) return
    // E-mail jde na nastavenou adresu, jinak vlastníkovi workspace.
    const emailTo = ws.notification_email || (await getOwnerContact(ws.clerk_user_id)).email
    if (!emailTo && !ws.notification_phone) return

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const tasks: Promise<unknown>[] = []
    if (emailTo) {
      tasks.push(sendCallSummary({ ...data, to: emailTo, messages: data.messages ?? [] }))
    }
    if (ws.notification_phone) {
      tasks.push(sendCallSms({ ...data, to: ws.notification_phone, appUrl }))
    }
    // Email a SMS jsou nezávislé – selhání jednoho (např. neověřená doména v Resend) neblokuje druhé.
    for (const r of await Promise.allSettled(tasks)) {
      if (r.status === 'rejected') console.error('Notifications: send failed', r.reason)
    }
  } catch (e) {
    console.error('Notifications: failed', e)
  }
}
