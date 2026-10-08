import 'server-only'
import { createElement } from 'react'
import { PlanChangeEmail, planChangeSubject, type PlanChangeVariant } from '@/emails/plan-change'
import { getWorkspaceEmailLocale } from '@/lib/email/get-workspace-locale'
import { getOwnerContact } from '@/lib/email/recipients'
import { sendEmail } from '@/lib/email/send'
import { createAdminClient } from '@/lib/supabase/admin'

/** E-mail o snížení plánu (přesažené limity) nebo o zrušení předplatného. Příjemce: vlastník, jinak notification_email. */
export async function sendPlanChangeEmail(data: { workspaceId: string; variant: PlanChangeVariant }): Promise<void> {
  const { data: ws } = await createAdminClient()
    .from('workspaces')
    .select('clerk_user_id, notification_email')
    .eq('id', data.workspaceId)
    .maybeSingle()
  if (!ws) return
  const to = (await getOwnerContact(ws.clerk_user_id)).email || ws.notification_email
  if (!to) return
  const locale = await getWorkspaceEmailLocale(data.workspaceId)
  await sendEmail({
    to,
    subject: planChangeSubject(locale, data.variant),
    element: createElement(PlanChangeEmail, { workspaceId: data.workspaceId, variant: data.variant, locale }),
  })
}
