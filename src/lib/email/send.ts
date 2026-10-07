import 'server-only'
import { render } from '@react-email/render'
import type { ReactElement } from 'react'
import { getResendClient, isResendConfigured } from '@/lib/resend/client'

/** Odesílatel; bez vlastní domény stačí výchozí onboarding@resend.dev (Resend ho povoluje jen pro testování). */
export const emailFrom = () => process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

/**
 * Vykreslí React Email šablonu (HTML + textová verze) a pošle ji přes Resend.
 * Bez RESEND_API_KEY jen zaloguje varování; chybu odeslání vyhazuje volající si zachytí.
 */
export async function sendEmail({
  to,
  subject,
  element,
}: {
  to: string
  subject: string
  element: ReactElement
}): Promise<void> {
  if (!isResendConfigured()) {
    console.warn('Email: RESEND_API_KEY is not set, skipping email')
    return
  }
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
  const { error } = await getResendClient().emails.send({
    from: emailFrom(),
    to,
    subject: subject.replace(/[\r\n]+/g, ' '),
    html,
    text,
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}
