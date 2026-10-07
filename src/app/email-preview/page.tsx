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
      ? 'AI: Dobrý den, restaurace U Nováků, jak vám mohu pomoci?'
      : 'Zákazník: Dobrý den, chtěl bych rezervovat stůl na sobotu na šest lidí.'
).join('\n')

// Vývojářská stránka: v produkci 404.
export default async function EmailPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const emails = [
    {
      id: 'call-notification',
      label: 'Notifikace o hovoru',
      html: await render(
        CallNotificationEmail({
          agentName: 'Aida',
          callerNumber: '+420777123456',
          duration: 154,
          startedAt: '2026-10-06T12:32:00Z',
          summary: 'Zákazník se ptal na otevírací dobu o víkendu a rezervoval stůl na sobotu pro šest osob.',
          transcript: LONG_TRANSCRIPT,
          callId: '00000000-0000-0000-0000-000000000000',
          businessName: 'Restaurace U Nováků',
        })
      ),
    },
    {
      id: 'welcome',
      label: 'Uvítací e-mail',
      html: await render(WelcomeEmail({ firstName: 'Jakub', businessName: 'Restaurace U Nováků', agentName: 'Aida' })),
    },
    {
      id: 'subscription',
      label: 'Potvrzení předplatného',
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
