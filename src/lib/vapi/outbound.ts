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
    if (!('id' in res) || !res.id) throw new OutboundCallError('Vapi nevrátilo ID hovoru.', 502)
    return res.id
  } catch (e) {
    if (e instanceof OutboundCallError) throw e
    if (e instanceof VapiError) {
      const raw = (e.body as { message?: string | string[] } | undefined)?.message
      const detail = Array.isArray(raw) ? raw.join(' ') : (raw ?? '')
      console.error('Vapi: outbound call rejected', e.statusCode, detail)
      if (/E\.164|valid phone number/i.test(detail)) {
        throw new OutboundCallError('Zadané telefonní číslo není platné.', 422)
      }
      if (e.statusCode === 401 || e.statusCode === 403) {
        throw new OutboundCallError('Vapi odmítlo přístup, zkontrolujte VAPI_API_KEY.', 502)
      }
      if (e.statusCode === 404 || /phone ?number|assistant/i.test(detail)) {
        throw new OutboundCallError('Číslo nebo agent nejsou ve Vapi správně nastavené. Zkuste číslo přiřadit znovu.', 422)
      }
      if (e.statusCode === 429) throw new OutboundCallError('Vapi je přetížené, zkuste to za chvíli.', 429)
      throw new OutboundCallError(`Vapi hovor odmítlo${detail ? `: ${detail}` : '.'}`, 502)
    }
    console.error('Vapi: outbound call failed', e)
    throw new OutboundCallError('Spojení s Vapi selhalo, zkuste to prosím znovu.', 502)
  }
}
