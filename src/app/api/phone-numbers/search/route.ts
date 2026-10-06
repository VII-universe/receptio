import { NextResponse } from 'next/server'
import { requirePhoneIntegrations, requireWorkspace } from '@/lib/api-auth'
import { searchAvailableNumbers } from '@/lib/twilio/phone-numbers'

// GET /api/phone-numbers/search?country=CZ
export async function GET(request: Request) {
  const unavailable = requirePhoneIntegrations()
  if (unavailable) return unavailable.response
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response

  const country = (new URL(request.url).searchParams.get('country') ?? 'CZ').toUpperCase()
  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ error: 'Invalid country' }, { status: 400 })
  }

  try {
    return NextResponse.json({ numbers: await searchAvailableNumbers(country, 10) })
  } catch (e) {
    console.error('Twilio: search failed', e)
    return NextResponse.json({ error: 'Vyhledání čísel selhalo' }, { status: 502 })
  }
}
