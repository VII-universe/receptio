import { NextResponse } from 'next/server'
import { requirePhoneIntegrations, requireWorkspaceAdmin } from '@/lib/api-auth'
import { PHONE_NUMBER_MONTHLY_COST, phoneNumbersLimitFor } from '@/lib/stripe/plans'
import { searchAvailableNumbers } from '@/lib/twilio/phone-numbers'

// GET /api/phone-numbers/available – dostupná česká čísla (od plánu Starter)
export async function GET() {
  const unavailable = requirePhoneIntegrations()
  if (unavailable) return unavailable.response
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response

  if (phoneNumbersLimitFor(ctx.workspace.plan) === 0) {
    return NextResponse.json({ error: 'Telefonní čísla jsou dostupná od plánu Starter' }, { status: 403 })
  }

  try {
    const numbers = await searchAvailableNumbers('CZ', 10)
    return NextResponse.json({
      numbers: numbers.map((n) => ({ ...n, monthlyPrice: PHONE_NUMBER_MONTHLY_COST })),
    })
  } catch (e) {
    console.error('Twilio: search failed', e)
    return NextResponse.json({ error: 'Vyhledání čísel selhalo' }, { status: 502 })
  }
}
