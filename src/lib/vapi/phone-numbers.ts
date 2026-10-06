import 'server-only'
import { vapi } from './client'

// Vapi si při importu Twilio čísla samo nastaví příchozí webhook v Twilio,
// proto zde není žádný krok "configure" na straně Twilio.
export async function registerTwilioNumber(params: { number: string; assistantId: string }) {
  return vapi.phoneNumbers.create({
    provider: 'twilio',
    number: params.number,
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID!,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN!,
    assistantId: params.assistantId,
  })
}

export async function getVapiPhoneNumber(id: string) {
  return vapi.phoneNumbers.get({ id })
}

export async function attachAssistantToNumber(id: string, assistantId: string) {
  return vapi.phoneNumbers.update({ id, body: { provider: 'twilio', assistantId } })
}

export async function deleteVapiPhoneNumber(id: string) {
  return vapi.phoneNumbers.delete({ id })
}
