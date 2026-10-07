import { notFound } from 'next/navigation'
import { render } from '@react-email/render'
import { CallSummaryEmail } from '@/emails/call-summary'
import { InviteEmail } from '@/emails/invite'
import { SubscriptionConfirmationEmail } from '@/emails/subscription-confirmation'
import { WelcomeEmail } from '@/emails/welcome'
import { EmailPreview } from './email-preview'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Email preview', robots: { index: false, follow: false } }

// Vývojářská stránka: v produkci 404.
export default async function EmailPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const emails = [
    {
      id: 'call-summary',
      label: 'Call summary',
      html: await render(
        CallSummaryEmail({
          workspaceId: 'mock',
          agentName: 'Alex',
          callerNumber: '+420 777 123 456',
          duration: '2:34',
          startedAt: new Date('2026-10-06T12:32:00Z'),
          summary: 'The customer asked about weekend opening hours and booked a table for six on Saturday.',
          transcript: [
            { role: 'agent', text: "Hello, Novak's Restaurant, how can I help you?" },
            { role: 'customer', text: 'Hi, I would like to book a table for six on Saturday.' },
          ],
          callId: 'mock',
          dashboardUrl: 'http://localhost:3000/dashboard/calls/mock',
          locale: 'en',
        })
      ),
    },
    {
      id: 'invite',
      label: 'Invitation',
      html: await render(
        InviteEmail({ workspaceId: 'mock', inviterName: 'Jakub Fidler', workspaceName: "Novak's Restaurant", inviteUrl: 'https://example.com/invitation/abc', locale: 'en' })
      ),
    },
    {
      id: 'welcome',
      label: 'Welcome email',
      html: await render(WelcomeEmail({ workspaceId: 'mock', ownerName: 'Jakub', agentName: 'Alex', locale: 'en' })),
    },
    {
      id: 'subscription',
      label: 'Subscription confirmation',
      html: await render(
        SubscriptionConfirmationEmail({
          firstName: 'Jakub',
          planName: 'Business',
          price: 2490,
          currency: 'CZK',
          nextBillingDate: '6. 11. 2026',
        })
      ),
    },
  ]

  return <EmailPreview emails={emails} />
}
