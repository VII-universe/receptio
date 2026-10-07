import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { checkAgentLimit, checkMinutesLimit, checkPhoneNumberLimit } from '@/lib/billing/check-limit'

// GET /api/usage – aktuální využití limitů plánu (minuty, agenti, telefonní čísla)
export async function GET() {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  const id = ctx.workspace.id

  try {
    const [minutes, agents, phoneNumbers] = await Promise.all([checkMinutesLimit(id), checkAgentLimit(id), checkPhoneNumberLimit(id)])
    return NextResponse.json({
      plan: minutes.plan,
      callsPaused: minutes.paused,
      minutes: { used: minutes.used, max: minutes.max },
      agents: { current: agents.current, max: agents.max },
      phoneNumbers: { current: phoneNumbers.current, max: phoneNumbers.max },
    })
  } catch (e) {
    console.error('Failed to load usage', e)
    return NextResponse.json({ error: 'Failed to load usage' }, { status: 500 })
  }
}
