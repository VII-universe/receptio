import { NextResponse } from 'next/server'
import { VapiError } from '@vapi-ai/server-sdk'
import { requirePhoneIntegrations, requireWorkspace } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'
import { releasePhoneNumber } from '@/lib/twilio/phone-numbers'
import { deleteVapiPhoneNumber } from '@/lib/vapi/phone-numbers'

// DELETE /api/phone-numbers/:id – uvolní číslo v Vapi i Twilio a smaže ho ze Supabase
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unavailable = requirePhoneIntegrations()
  if (unavailable) return unavailable.response
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Number not found' }, { status: 404 })

  const supabase = createAdminClient()
  const { data: number, error: findError } = await supabase
    .from('phone_numbers')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .maybeSingle()
  if (findError) {
    console.error('Failed to load phone number', findError)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if (!number) return NextResponse.json({ error: 'Number not found' }, { status: 404 })

  try {
    if (number.vapi_phone_number_id) {
      await deleteVapiPhoneNumber(number.vapi_phone_number_id).catch((e) => {
        if (!(e instanceof VapiError && e.statusCode === 404)) throw e
      })
    }
    await releasePhoneNumber(number.twilio_sid)
  } catch (e) {
    // Řádek v DB zůstává, takže uvolnění jde zopakovat (404 se toleruje).
    console.error('Phone release failed', e)
    return NextResponse.json({ error: 'Uvolnění čísla selhalo' }, { status: 502 })
  }

  const { error: agentError } = await supabase
    .from('agents')
    .update({ phone_number_id: null, phone_number: null, is_active: false })
    .eq('phone_number_id', number.id)
  if (agentError) console.error('Failed to detach number from agent', agentError)

  const { error } = await supabase.from('phone_numbers').delete().eq('id', number.id)
  if (error) {
    console.error('Failed to delete phone number row', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  return NextResponse.json({ deleted: true })
}
