import 'server-only'
import { VapiError } from '@vapi-ai/server-sdk'
import { vapi } from './client'

export class OutboundCallError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
  }
}

/** Zavolá zákazníkovi z čísla agenta s jeho asistentem. Chyby Vapi překládá do srozumitelné češtiny. */
export async function createOutboundCall(params: {
  assistantId: string
  phoneNumberId: string
  customerNumber: string // E.164
}): Promise<string> {
  try {
    const res = await vapi.calls.create({
      assistantId: params.assistantId,
      phoneNumberId: params.phoneNumberId,
      customer: { number: params.customerNumber },
    })
    if (!('id' in res) || !res.id) throw new OutboundCallError('Vapi did not return a call ID.', 502)
    return res.id
  } catch (e) {
    if (e instanceof OutboundCallError) throw e
    if (e instanceof VapiError) {
      const raw = (e.body as { message?: string | string[] } | undefined)?.message
      const detail = Array.isArray(raw) ? raw.join(' ') : (raw ?? '')
      console.error('Vapi: outbound call rejected', e.statusCode, detail)
      if (/E\.164|valid phone number/i.test(detail)) {
        throw new OutboundCallError('The phone number is not valid.', 422)
      }
      if (e.statusCode === 401 || e.statusCode === 403) {
        throw new OutboundCallError('Vapi rejected the access, check VAPI_API_KEY.', 502)
      }
      if (e.statusCode === 404 || /phone ?number|assistant/i.test(detail)) {
        throw new OutboundCallError('The number or agent is not set up correctly in Vapi. Try assigning the number again.', 422)
      }
      if (e.statusCode === 429) throw new OutboundCallError('Vapi is overloaded, please try again in a moment.', 429)
      throw new OutboundCallError(`Vapi rejected the call${detail ? `: ${detail}` : '.'}`, 502)
    }
    console.error('Vapi: outbound call failed', e)
    throw new OutboundCallError('Connecting to Vapi failed, please try again.', 502)
  }
}
