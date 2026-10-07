import 'server-only'
import { createElement } from 'react'
import { SubscriptionConfirmationEmail } from '@/emails/subscription-confirmation'
import { PLANS, type PaidPlanId } from '@/lib/stripe/plans'
import { formatCzDate } from './format'
import { sendEmail } from './send'

/** E-mail o aktivaci předplatného. Chyby vyhazuje; volající je zachytí. */
export async function sendSubscriptionConfirmationEmail(data: {
  email: string
  firstName: string
  plan: PaidPlanId
  nextBillingDate: string | null // ISO
}): Promise<void> {
  const plan = PLANS[data.plan]
  await sendEmail({
    to: data.email,
    subject: `Předplatné ${plan.nameCs} je aktivní`,
    element: createElement(SubscriptionConfirmationEmail, {
      firstName: data.firstName,
      planName: plan.nameCs,
      price: `${plan.price.toLocaleString('cs-CZ')} Kč`,
      nextBillingDate: data.nextBillingDate ? formatCzDate(data.nextBillingDate) : '–',
    }),
  })
}
