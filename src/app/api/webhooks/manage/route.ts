import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkWebhookUrl } from '@/lib/webhooks/url-guard'
import {
  isWebhookEvents,
  MAX_WEBHOOKS_PER_WORKSPACE,
  WEBHOOK_PUBLIC_COLUMNS,
} from '@/lib/webhooks/events'

// Správa zákaznických webhooků. (/api/webhooks/vapi a /stripe jsou příchozí webhooky a s tímto nesouvisí.)

// GET /api/webhooks/manage – webhooky workspace (bez secretu)
export async function GET() {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response

  const { data, error } = await createAdminClient()
    .from('webhooks')
    .select(WEBHOOK_PUBLIC_COLUMNS)
    .eq('workspace_id', ctx.workspace.id)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Failed to load webhooks', error)
    return NextResponse.json({ error: 'Failed to load webhooks' }, { status: 500 })
  }
  return NextResponse.json({ webhooks: data })
}

// POST /api/webhooks/manage  Body: { name, url, events?, is_active? }
// Vrací { ...webhook, secret } – secret se zobrazí JEDNOU.
export async function POST(request: Request) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!name || name.length > 100) {
    return NextResponse.json({ error: 'A name is required (max. 100 characters)' }, { status: 400 })
  }
  const check = checkWebhookUrl(url)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const events: unknown = body?.events ?? ['call.completed']
  if (!isWebhookEvents(events)) return NextResponse.json({ error: 'Invalid events' }, { status: 400 })
  if (body?.is_active != null && typeof body.is_active !== 'boolean') {
    return NextResponse.json({ error: 'Invalid is_active' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { count, error: countError } = await supabase
    .from('webhooks')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', ctx.workspace.id)
  if (countError) {
    console.error('Failed to count webhooks', countError)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if ((count ?? 0) >= MAX_WEBHOOKS_PER_WORKSPACE) {
    return NextResponse.json({ error: 'You have reached the maximum number of webhooks.' }, { status: 403 })
  }

  const secret = randomBytes(32).toString('hex')
  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      workspace_id: ctx.workspace.id,
      name,
      url,
      secret,
      events,
      is_active: body?.is_active ?? true,
    })
    .select(WEBHOOK_PUBLIC_COLUMNS)
    .single()
  if (error) {
    console.error('Failed to create webhook', error)
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
  }

  return NextResponse.json(
    { ...data, secret, warning: check.warning },
    { status: 201, headers: { 'Cache-Control': 'no-store' } }
  )
}
