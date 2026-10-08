import 'server-only'
import { createElement } from 'react'
import { TrialEmail, trialEmailSubject, type TrialEmailVariant } from '@/emails/trial-ending'
import { getWorkspaceEmailLocale } from '@/lib/email/get-workspace-locale'
import { getOwnerContact } from '@/lib/email/recipients'
import { sendEmail } from '@/lib/email/send'
import { createAdminClient } from '@/lib/supabase/admin'

/** Upozornění na konec trialu ('ending') nebo na jeho skončení ('ended'). Příjemce: vlastník workspace, jinak notification_email. */
export async function sendTrialEmail(data: { workspaceId: string; variant: TrialEmailVariant; daysLeft?: number }): Promise<void> {
  const { data: ws } = await createAdminClient()
    .from('workspaces')
    .select('clerk_user_id, notification_email')
    .eq('id', data.workspaceId)
    .maybeSingle()
  if (!ws) return
  const to = (await getOwnerContact(ws.clerk_user_id)).email || ws.notification_email
  if (!to) return
  const locale = await getWorkspaceEmailLocale(data.workspaceId)
  const daysLeft = data.daysLeft ?? 0
  await sendEmail({
    to,
    subject: trialEmailSubject(locale, data.variant, daysLeft),
    element: createElement(TrialEmail, { workspaceId: data.workspaceId, variant: data.variant, daysLeft, locale }),
  })
}
