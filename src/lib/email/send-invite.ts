import 'server-only'
import { createElement } from 'react'
import { InviteEmail, inviteSubject } from '@/emails/invite'
import { getWorkspaceEmailLocale } from '@/lib/email/get-workspace-locale'
import { safeHttpUrl } from '@/lib/email/recipients'
import { sendEmail } from '@/lib/email/send'

/**
 * Pozvánka do workspace v jazyce workspace, který zve (pozvaný ještě vlastní workspace nemá).
 * Reply-to je e-mail zvoucího. Neplatná/chybějící URL pozvánky = e-mail se nepošle.
 */
export async function sendInviteEmail(data: {
  workspaceId: string
  to: string
  inviterName: string
  inviterEmail?: string | null
  workspaceName: string
  inviteUrl: string | null | undefined
}): Promise<boolean> {
  const inviteUrl = safeHttpUrl(data.inviteUrl)
  if (!inviteUrl) return false
  const locale = await getWorkspaceEmailLocale(data.workspaceId)
  await sendEmail({
    to: data.to,
    replyTo: data.inviterEmail ?? undefined,
    subject: inviteSubject(locale, data.inviterName, data.workspaceName),
    element: createElement(InviteEmail, {
      workspaceId: data.workspaceId,
      inviterName: data.inviterName,
      workspaceName: data.workspaceName,
      inviteUrl,
      locale,
    }),
  })
  return true
}
