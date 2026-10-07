import { notFound } from 'next/navigation'
import { render } from '@react-email/render'
import { CallNotificationEmail } from '@/emails/call-notification'
import { SubscriptionConfirmationEmail } from '@/emails/subscription-confirmation'
import { WelcomeEmail } from '@/emails/welcome'
import { EmailPreview } from './email-preview'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Email preview', robots: { index: false, follow: false } }

const LONG_TRANSCRIPT = Array.from(
  { length: 12 },
  (_, i) =>
    i % 2 === 0
      ? 'AI: Hello, Novak\'s Restaurant, how can I help you?'
      : 'Customer: Hello, I would like to book a table for six on Saturday.'
).join('\n')

// Vývojářská stránka: v produkci 404.
export default async function EmailPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const emails = [
    {
      id: 'call-notification',
      label: 'Call notification',
      html: await render(
        CallNotificationEmail({
          agentName: 'Alex',
          callerNumber: '+420777123456',
          duration: 154,
          startedAt: '2026-10-06T12:32:00Z',
          summary: 'The customer asked about weekend opening hours and booked a table for six on Saturday.',
          transcript: LONG_TRANSCRIPT,
          callId: '00000000-0000-0000-0000-000000000000',
          businessName: 'Novak\'s Restaurant',
        })
      ),
    },
    {
      id: 'welcome',
      label: 'Welcome email',
      html: await render(WelcomeEmail({ firstName: 'Jakub', businessName: 'Novak\'s Restaurant', agentName: 'Aida' })),
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
