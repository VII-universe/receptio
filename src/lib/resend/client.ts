import 'server-only'
import { Resend } from 'resend'

export const isResendConfigured = () => Boolean(process.env.RESEND_API_KEY)

// Lazy: new Resend() bez klíče vyhazuje chybu hned při vytvoření.
export function getResendClient() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set')
  return new Resend(process.env.RESEND_API_KEY)
}
