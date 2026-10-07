import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'
import { checkWebhookUrl } from '@/lib/webhooks/url-guard'
import { isWebhookEvents, WEBHOOK_PUBLIC_COLUMNS } from '@/lib/webhooks/events'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/webhooks/manage/:id  Body (vše volitelné): { name, url, events, is_active }
export async function PATCH(request: Request, { params }: Ctx) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const update: Record<string, string | string[] | boolean | number> = {}
  let warning: string | undefined

  if ('name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 100) return NextResponse.json({ error: 'Název je povinný (max. 100 znaků)' }, { status: 400 })
    update.name = name
  }
  if ('url' in body) {
    const url = typeof body.url === 'string' ? body.url.trim() : ''
    const check = checkWebhookUrl(url)
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })
    warning = check.warning
    update.url = url
    update.failure_count = 0 // nová adresa = nové počítání selhání
  }
  if ('events' in body) {
    if (!isWebhookEvents(body.events)) return NextResponse.json({ error: 'Invalid events' }, { status: 400 })
    update.events = body.events
  }
  if ('is_active' in body) {
    if (typeof body.is_active !== 'boolean') return NextResponse.json({ error: 'Invalid is_active' }, { status: 400 })
    update.is_active = body.is_active
    if (body.is_active) update.failure_count = 0 // znovu zapnutý webhook začíná čistě
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await createAdminClient()
    .from('webhooks')
    .update(update)
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .select(WEBHOOK_PUBLIC_COLUMNS)
    .maybeSingle()
  if (error) {
    console.error('Failed to update webhook', error)
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  return NextResponse.json({ webhook: data, warning })
}

// DELETE /api/webhooks/manage/:id
export async function DELETE(_request: Request, { params }: Ctx) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })

  const { data, error } = await createAdminClient()
    .from('webhooks')
    .delete()
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .select('id')
  if (error) {
    console.error('Failed to delete webhook', error)
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
  }
  if (!data || data.length === 0) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  return NextResponse.json({ deleted: true })
}
