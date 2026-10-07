import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { changeWorkspaceCurrency } from '@/lib/billing/currency'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'
import { isCurrency } from '@/lib/stripe/plans'

// PATCH /api/admin/workspaces/:id/currency  Body: { currency: 'CZK' | 'EUR' }
// Jen pro workspace bez aktivního předplatného (ceny ve Stripe jsou vázané na měnu).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!isCurrency(body?.currency)) return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })

  const { data: workspace, error } = await createAdminClient()
    .from('workspaces')
    .select('id, plan, stripe_subscription_id, currency')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('Admin: workspace lookup failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const result = await changeWorkspaceCurrency(workspace, body.currency)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 })

  console.info(`[admin-audit] admin=${admin} workspace=${id} currency ${workspace.currency} -> ${body.currency}`)
  return NextResponse.json({ success: true })
}
