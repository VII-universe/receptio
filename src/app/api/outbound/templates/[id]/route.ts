import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { templateInputSchema } from '@/lib/outbound/schema'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'

type Ctx = { params: Promise<{ id: string }> }

// PUT /api/outbound/templates/:id – přepíše šablonu (včetně zapnutí/vypnutí)
export async function PUT(request: Request, { params }: Ctx) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  const parsed = templateInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: current } = await supabase.from('outbound_templates').select('active').eq('id', id).eq('workspace_id', ctx.workspace.id).maybeSingle()
  if (!current) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  // Po zapnutí se "od kdy" posune na teď: rezervace vytvořené dřív se zpětně nevolají.
  const reactivated = parsed.data.active && !current.active
  const { data, error } = await supabase
    .from('outbound_templates')
    .update({ ...parsed.data, ...(reactivated ? { active_since: new Date().toISOString() } : {}) })
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .select('*')
    .single()
  if (error) {
    console.error('Outbound: failed to update template', error)
    return NextResponse.json({ error: 'Failed to save the template' }, { status: 500 })
  }
  return NextResponse.json({ template: data })
}

// DELETE /api/outbound/templates/:id – smaže šablonu; čekající hovory z ní se zruší
export async function DELETE(_request: Request, { params }: Ctx) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  const supabase = createAdminClient()
  await supabase.from('outbound_calls').update({ status: 'cancelled', error_message: 'Šablona byla smazána' }).eq('template_id', id).eq('workspace_id', ctx.workspace.id).eq('status', 'pending')
  const { error } = await supabase.from('outbound_templates').delete().eq('id', id).eq('workspace_id', ctx.workspace.id)
  if (error) {
    console.error('Outbound: failed to delete template', error)
    return NextResponse.json({ error: 'Failed to delete the template' }, { status: 500 })
  }
  return NextResponse.json({ deleted: true })
}
