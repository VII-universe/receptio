import { NextResponse } from 'next/server'
import { requireAgent, requirePhoneIntegrations } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { attachAssistantToNumber, getVapiPhoneNumber } from '@/lib/vapi/phone-numbers'

// POST /api/phone-numbers/assign  Body: { agentId, vapiPhoneNumberId }
// Přiřadí už existující (Twilio) číslo z Vapi agentovi přihlášeného uživatele.
export async function POST(request: Request) {
  const unavailable = requirePhoneIntegrations()
  if (unavailable) return unavailable.response
  const ctx = await requireAgent()
  if ('response' in ctx) return ctx.response
  const { agent } = ctx

  const body = await request.json().catch(() => null)
  if (typeof body?.agentId !== 'string' || typeof body?.vapiPhoneNumberId !== 'string') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  // Agent musí patřit workspace přihlášeného uživatele.
  if (body.agentId !== agent.id) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }
  if (!agent.vapi_agent_id) {
    return NextResponse.json({ error: 'Asistent ještě není propojený s Vapi' }, { status: 409 })
  }

  const supabase = createAdminClient()

  // Číslo nesmí patřit jinému agentovi (Vapi účet je sdílený mezi všemi workspace).
  const { data: taken, error: takenError } = await supabase
    .from('agents')
    .select('id')
    .eq('vapi_phone_number_id', body.vapiPhoneNumberId)
    .neq('id', agent.id)
    .limit(1)
  if (takenError) {
    console.error('Assign: lookup failed', takenError)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if (taken && taken.length > 0) {
    return NextResponse.json({ error: 'Číslo už je přiřazené jinému asistentovi' }, { status: 409 })
  }

  try {
    const number = await getVapiPhoneNumber(body.vapiPhoneNumberId)
    if (number.provider !== 'twilio') {
      return NextResponse.json({ error: 'Podporována jsou jen Twilio čísla' }, { status: 400 })
    }
    await attachAssistantToNumber(body.vapiPhoneNumberId, agent.vapi_agent_id)

    const { data, error } = await supabase
      .from('agents')
      .update({
        phone_number: number.number ?? null,
        vapi_phone_number_id: body.vapiPhoneNumberId,
        is_active: true,
      })
      .eq('id', agent.id)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ agent: data })
  } catch (e) {
    console.error('Assign phone number failed', e)
    return NextResponse.json({ error: 'Přiřazení čísla selhalo' }, { status: 502 })
  }
}
