import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'
import { isPlanId, PLANS } from '@/lib/stripe/plans'

// PATCH /api/admin/workspaces/:id/plan  Body: { plan: 'free' | 'starter' | 'business' | 'pro' }
// Mění jen databázi; předplatné ve Stripe se NEAKTUALIZUJE (a obnovení ze Stripe plán může přepsat).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const plan: unknown = body?.plan
  if (!isPlanId(plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: before, error: findError } = await supabase.from('workspaces').select('plan').eq('id', id).maybeSingle()
  if (findError) {
    console.error('Admin: workspace lookup failed', findError)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if (!before) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  // Limit minut se mění spolu s plánem, jinak by se plán a vynucovaný limit rozešly.
  const { error } = await supabase
    .from('workspaces')
    .update({ plan, minutes_limit: PLANS[plan].minutesLimit })
    .eq('id', id)
  if (error) {
    console.error('Admin: plan update failed', error)
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }

  // Audit log zatím není, změna se zapíše do logu.
  console.info(`[admin-audit] admin=${admin} workspace=${id} plan ${before.plan} -> ${plan}`)

  return NextResponse.json({ success: true, warning: 'Stripe subscription nebyla aktualizována' })
}
