import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { checkMinutesLimit } from '@/lib/billing/check-limits'

// GET /api/billing/status
export async function GET() {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  const { workspace } = ctx

  try {
    const limits = await checkMinutesLimit(workspace.id)
    return NextResponse.json({
      plan: workspace.plan,
      status: workspace.plan_status,
      minutes_used: limits.minutesUsed,
      minutes_limit: limits.minutesLimit,
      allowed: limits.allowed,
      billing_period_end: workspace.billing_period_end,
    })
  } catch (e) {
    console.error('Failed to load billing status', e)
    return NextResponse.json({ error: 'Failed to load billing status' }, { status: 500 })
  }
}
