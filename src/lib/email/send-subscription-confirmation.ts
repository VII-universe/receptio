import 'server-only'
import { createElement } from 'react'
import { SubscriptionConfirmationEmail } from '@/emails/subscription-confirmation'
import { PLANS, PLAN_PRICES, type Currency, type PaidPlanId } from '@/lib/stripe/plans'
import { formatCzDate } from './format'
import { sendEmail } from './send'

/** E-mail o aktivaci předplatného. Chyby vyhazuje; volající je zachytí. */
export async function sendSubscriptionConfirmationEmail(data: {
  email: string
  firstName: string
  plan: PaidPlanId
  currency: Currency
  nextBillingDate: string | null // ISO
}): Promise<void> {
  const plan = PLANS[data.plan]
  await sendEmail({
    to: data.email,
    subject: `Předplatné ${plan.nameCs} je aktivní`,
    element: createElement(SubscriptionConfirmationEmail, {
      firstName: data.firstName,
      planName: plan.nameCs,
      price: PLAN_PRICES[data.plan][data.currency],
      currency: data.currency,
      nextBillingDate: data.nextBillingDate ? formatCzDate(data.nextBillingDate) : '–',
    }),
  })
}
