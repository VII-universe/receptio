import 'server-only'
import { createElement } from 'react'
import { WelcomeEmail, welcomeSubject } from '@/emails/welcome'
import { getWorkspaceEmailLocale } from '@/lib/email/get-workspace-locale'
import { sendEmail } from './send'

/** Uvítací e-mail po dokončení onboardingu v jazyce workspace. Chyby vyhazuje; volající je zachytí. */
export async function sendWelcomeEmail(data: {
  workspaceId: string
  email: string
  ownerName: string
  agentName: string
}): Promise<void> {
  const locale = await getWorkspaceEmailLocale(data.workspaceId)
  await sendEmail({
    to: data.email,
    subject: welcomeSubject(locale, data.agentName),
    element: createElement(WelcomeEmail, {
      workspaceId: data.workspaceId,
      ownerName: data.ownerName,
      agentName: data.agentName,
      locale,
    }),
  })
}
