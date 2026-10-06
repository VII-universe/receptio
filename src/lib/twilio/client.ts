import 'server-only'
import twilio from 'twilio'

export const isTwilioConfigured = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)

// Lazy: bez klíčů by vytvoření klienta při importu spadlo.
export function getTwilioClient() {
  if (!isTwilioConfigured()) throw new Error('Twilio is not configured')
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
}
