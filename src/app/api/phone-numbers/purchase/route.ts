import { NextResponse } from 'next/server'
import { requirePhoneIntegrations, requireWorkspaceAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentById } from '@/lib/supabase/queries'
import { countryOfNumber } from '@/lib/countries'
import { phoneNumbersLimitFor } from '@/lib/stripe/plans'
import { getLocalNumberPrice, purchasePhoneNumber, releasePhoneNumber } from '@/lib/twilio/phone-numbers'
import { deleteVapiPhoneNumber, registerTwilioNumber } from '@/lib/vapi/phone-numbers'

const E164 = /^\+[1-9]\d{6,14}$/

// POST /api/phone-numbers/purchase  Body: { phoneNumber, agentId }
// Zakoupí číslo v Twilio (REÁLNÁ PLATBA), zaregistruje ho ve Vapi s asistentem agenta
// (Vapi si samo nastaví příchozí webhook v Twilio) a uloží do Supabase.
// Při selhání kteréhokoli kroku se předchozí kroky vrátí zpět.
export async function POST(request: Request) {
  const unavailable = requirePhoneIntegrations()
  if (unavailable) return unavailable.response
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { workspace } = ctx

  const limit = phoneNumbersLimitFor(workspace.plan)
  if (limit === 0) {
    return NextResponse.json({ error: 'Telefonní čísla jsou dostupná od plánu Starter' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const phoneNumber = typeof body?.phoneNumber === 'string' ? body.phoneNumber : ''
  const agentId = typeof body?.agentId === 'string' ? body.agentId : ''
  if (!E164.test(phoneNumber) || !agentId) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Agent musí patřit workspace přihlášeného uživatele.
  const agent = await getAgentById(workspace.id, agentId)
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  if (!agent.vapi_agent_id) {
    return NextResponse.json({ error: 'Agent ještě není propojený s Vapi' }, { status: 409 })
  }

  const supabase = createAdminClient()
  const { data: existing, error: existingError } = await supabase
    .from('phone_numbers')
    .select('agent_id')
    .eq('workspace_id', workspace.id)
  if (existingError) {
    console.error('Failed to load phone numbers', existingError)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if (existing.some((n) => n.agent_id === agent.id)) {
    return NextResponse.json({ error: 'Agent už má přiřazené číslo' }, { status: 409 })
  }
  if (existing.length >= limit) {
    return NextResponse.json({ error: 'Dosáhli jste limitu telefonních čísel pro váš plán.' }, { status: 403 })
  }

  let twilioSid: string
  let purchased: string
  try {
    ;({ sid: twilioSid, phoneNumber: purchased } = await purchasePhoneNumber(phoneNumber))
  } catch (e) {
    // Nic se neukládá, Twilio číslo neprodalo.
    console.error('Twilio: purchase failed', e)
    return NextResponse.json(
      { error: 'Zakoupení čísla selhalo', detail: e instanceof Error ? e.message : undefined },
      { status: 502 }
    )
  }

  // Skutečná měsíční cena z Twilio (USD); když ji nelze zjistit, uloží se null.
  const country = countryOfNumber(purchased)
  const price = country ? await getLocalNumberPrice(country.code) : null

  let vapiNumberId: string | undefined
  let rowId: string | undefined
  try {
    vapiNumberId = (await registerTwilioNumber({ number: purchased, assistantId: agent.vapi_agent_id })).id

    const { data: row, error: insertError } = await supabase
      .from('phone_numbers')
      .insert({
        workspace_id: workspace.id,
        agent_id: agent.id,
        twilio_sid: twilioSid,
        vapi_phone_number_id: vapiNumberId,
        phone_number: purchased,
        friendly_name: purchased,
        monthly_cost: price?.amount ?? null,
        cost_currency: price?.currency ?? 'USD',
      })
      .select('*')
      .single()
    if (insertError) throw insertError
    rowId = row.id

    const { error: agentError } = await supabase
      .from('agents')
      .update({ phone_number_id: row.id, phone_number: purchased, is_active: true })
      .eq('id', agent.id)
    if (agentError) throw agentError

    return NextResponse.json({ phoneNumber: row }, { status: 201 })
  } catch (e) {
    console.error('Phone purchase: rolling back', e)
    if (rowId) {
      await supabase.from('phone_numbers').delete().eq('id', rowId)
    }
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
