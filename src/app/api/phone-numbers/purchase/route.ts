import { NextResponse } from 'next/server'
import { requireAgent, requirePhoneIntegrations } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { purchasePhoneNumber, releasePhoneNumber } from '@/lib/twilio/phone-numbers'
import { deleteVapiPhoneNumber, registerTwilioNumber } from '@/lib/vapi/phone-numbers'

const E164 = /^\+[1-9]\d{6,14}$/

// POST /api/phone-numbers/purchase  Body: { phoneNumber }
// Zakoupí číslo v Twilio (REÁLNÁ PLATBA), zaregistruje ho ve Vapi s agentem workspace a uloží do DB.
// Při selhání kteréhokoli kroku se předchozí kroky vrátí zpět, aby nezůstalo placené číslo bez agenta.
export async function POST(request: Request) {
  const unavailable = requirePhoneIntegrations()
  if (unavailable) return unavailable.response
  const ctx = await requireAgent()
  if ('response' in ctx) return ctx.response
  const { agent } = ctx

  const body = await request.json().catch(() => null)
  const phoneNumber = typeof body?.phoneNumber === 'string' ? body.phoneNumber : ''
  if (!E164.test(phoneNumber)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }
  if (!agent.vapi_agent_id) {
    return NextResponse.json({ error: 'Asistent ještě není propojený s Vapi' }, { status: 409 })
  }
  if (agent.phone_number_sid || agent.vapi_phone_number_id) {
    return NextResponse.json({ error: 'Asistent už má přiřazené číslo' }, { status: 409 })
  }

  let twilioSid: string
  let purchased: string
  try {
    ;({ sid: twilioSid, phoneNumber: purchased } = await purchasePhoneNumber(phoneNumber))
  } catch (e) {
    console.error('Twilio: purchase failed', e)
    const detail = e instanceof Error ? e.message : undefined
    return NextResponse.json({ error: 'Zakoupení čísla selhalo', detail }, { status: 502 })
  }

  let vapiNumberId: string | undefined
  try {
    vapiNumberId = (await registerTwilioNumber({ number: purchased, assistantId: agent.vapi_agent_id })).id

    const { data, error } = await createAdminClient()
      .from('agents')
      .update({
        phone_number: purchased,
        phone_number_sid: twilioSid,
        vapi_phone_number_id: vapiNumberId,
        is_active: true,
      })
      .eq('id', agent.id)
      .select('*')
      .single()
    if (error) throw error

    return NextResponse.json({ agent: data }, { status: 201 })
  } catch (e) {
    console.error('Phone purchase: rolling back', e)
    if (vapiNumberId) {
      await deleteVapiPhoneNumber(vapiNumberId).catch((err) =>
        console.error('Rollback: failed to delete Vapi number', vapiNumberId, err)
      )
    }
    await releasePhoneNumber(twilioSid).catch((err) =>
      console.error('Rollback: failed to release Twilio number', twilioSid, err)
    )
    return NextResponse.json({ error: 'Registrace čísla se nezdařila, číslo bylo uvolněno' }, { status: 502 })
  }
}
