import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { isTimezone } from '@/lib/agents/working-hours'
import { BUSINESS_TYPES, isBusinessType } from '@/lib/onboarding'
import { publicWorkspace } from '@/lib/public-workspace'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Workspace } from '@/types'

// PATCH /api/workspaces/settings  Body (vše volitelné): { business_name, business_type, timezone }
// Vrací aktualizovaný workspace bez Stripe identifikátorů.
export async function PATCH(request: Request) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response

  const body = await request.json().catch(() => null)
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const update: Record<string, string> = {}

  if ('business_name' in body) {
    const name = typeof body.business_name === 'string' ? body.business_name.trim() : ''
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: 'Název firmy musí mít 2 až 100 znaků' }, { status: 400 })
    }
    // `name` je název, který se zobrazuje v dashboardu, drží se v souladu s business_name.
    update.business_name = name
    update.name = name
  }
  if ('business_type' in body) {
    if (!isBusinessType(body.business_type)) {
      return NextResponse.json({ error: 'Invalid business_type' }, { status: 400 })
    }
    update.business_type = body.business_type
    // industry (podle něj se vybírají šablony) se mění spolu s typem firmy
    update.industry = BUSINESS_TYPES.find((t) => t.id === body.business_type)!.industry
  }
  if ('timezone' in body) {
    if (!isTimezone(body.timezone)) {
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
    }
    update.timezone = body.timezone
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await createAdminClient()
    .from('workspaces')
    .update(update)
    .eq('id', ctx.workspace.id)
    .select('*')
    .single()
  if (error) {
    console.error('Failed to update workspace settings', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
  return NextResponse.json({ workspace: publicWorkspace(data as Workspace) })
}
