import 'server-only'
import { createElement } from 'react'
import { WelcomeEmail } from '@/emails/welcome'
import { sendEmail } from './send'

/** Uvítací e-mail po dokončení onboardingu. Chyby vyhazuje; volající je zachytí (nesmí blokovat onboarding). */
export async function sendWelcomeEmail(data: {
  email: string
  firstName: string
  businessName: string
  agentName: string
}): Promise<void> {
  await sendEmail({
    to: data.email,
    subject: 'Welcome to Receptio – your agent is ready',
    element: createElement(WelcomeEmail, {
      firstName: data.firstName,
      businessName: data.businessName,
      agentName: data.agentName,
    }),
  })
}
