import 'server-only'
import { createElement } from 'react'
import { LimitWarningEmail, limitWarningSubject } from '@/emails/limit-warning'
import { getWorkspaceEmailLocale } from '@/lib/email/get-workspace-locale'
import { getOwnerContact } from '@/lib/email/recipients'
import { sendEmail } from '@/lib/email/send'
import { createAdminClient } from '@/lib/supabase/admin'

/** Upozornění, že byl vyčerpán limit minut a hovory jsou pozastaveny. Příjemce: notification_email, jinak vlastník. */
export async function sendLimitWarning(data: { workspaceId: string; planName: string; used: number; max: number }): Promise<void> {
  const { data: ws } = await createAdminClient()
    .from('workspaces')
    .select('clerk_user_id, notification_email')
    .eq('id', data.workspaceId)
    .maybeSingle()
  if (!ws) return
  const to = ws.notification_email || (await getOwnerContact(ws.clerk_user_id)).email
  if (!to) return
  const locale = await getWorkspaceEmailLocale(data.workspaceId)
  await sendEmail({
    to,
    subject: limitWarningSubject(locale),
    element: createElement(LimitWarningEmail, { ...data, locale }),
  })
}
