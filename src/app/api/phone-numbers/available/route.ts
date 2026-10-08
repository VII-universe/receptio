import { NextResponse } from 'next/server'
import { effectivePlan } from '@/lib/billing/get-workspace-plan'
import { requirePhoneIntegrations, requireWorkspaceAdmin } from '@/lib/api-auth'
import { isCountryCode } from '@/lib/countries'
import { phoneNumbersLimitFor } from '@/lib/stripe/plans'
import { getLocalNumberPrice, isCountryUnavailable, searchAvailableNumbers } from '@/lib/twilio/phone-numbers'

// GET /api/phone-numbers/available?country=CZ – dostupná čísla ve vybrané zemi (od plánu Starter)
export async function GET(request: Request) {
  const unavailable = requirePhoneIntegrations()
  if (unavailable) return unavailable.response
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response

  if (phoneNumbersLimitFor(effectivePlan(ctx.workspace.plan, ctx.workspace.plan_status, ctx.workspace.trial_ends_at)) === 0) {
    return NextResponse.json({ error: 'Phone numbers are available from the Starter plan' }, { status: 403 })
  }

  const country = (new URL(request.url).searchParams.get('country') ?? 'CZ').toUpperCase()
  if (!isCountryCode(country)) {
    return NextResponse.json({ error: 'Unsupported country' }, { status: 400 })
  }

  try {
    const [numbers, price] = await Promise.all([searchAvailableNumbers(country, 10), getLocalNumberPrice(country)])
    // Prázdný seznam = pro zemi teď nejsou čísla (nebo ji Twilio pro tento typ nenabízí)
    return NextResponse.json({ country, numbers, price, noNumbers: numbers.length === 0 })
  } catch (e) {
    if (isCountryUnavailable(e)) {
      return NextResponse.json({ country, numbers: [], price: null, noNumbers: true })
    }
    console.error('Twilio: search failed', country, e)
    return NextResponse.json({ error: 'Searching for numbers failed' }, { status: 502 })
  }
}
