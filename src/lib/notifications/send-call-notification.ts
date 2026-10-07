import 'server-only'
import { sendCallEmail } from '@/lib/resend/notifications'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendCallSms } from '@/lib/twilio/notifications'

export interface CallNotificationData {
  workspaceId: string
  callId: string // ID záznamu call_logs (adresa detailu hovoru)
  agentName: string
  callerNumber: string | null
  startedAt: string
  durationSeconds: number | null
  summary: string | null
  transcript: string | null
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
      .select('name, notification_email, notification_phone, notifications_enabled')
      .eq('id', data.workspaceId)
      .maybeSingle()
    if (error) throw error
    if (!ws || !ws.notifications_enabled) return
    if (!ws.notification_email && !ws.notification_phone) return

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const tasks: Promise<unknown>[] = []
    if (ws.notification_email) {
      tasks.push(sendCallEmail({ ...data, businessName: ws.name, to: ws.notification_email, appUrl }))
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
