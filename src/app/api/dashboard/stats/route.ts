import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { getDashboardStats } from '@/lib/dashboard-stats'

// GET /api/dashboard/stats – souhrn pro přehled dashboardu
export async function GET() {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  try {
    return NextResponse.json(await getDashboardStats(ctx.workspace))
  } catch (e) {
    console.error('Failed to load dashboard stats', e)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
