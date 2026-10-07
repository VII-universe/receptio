import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'
import { sendWebhook } from '@/lib/webhooks/send'

// POST /api/webhooks/manage/:id/test – pošle testovací událost call.test.
// Výsledek se do databáze nezapisuje (neovlivní last_status_code ani failure_count).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })

  const { data: hook, error } = await createAdminClient()
    .from('webhooks')
    .select('url, secret')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .maybeSingle()
  if (error) {
    console.error('Failed to load webhook', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if (!hook) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })

  const now = new Date()
  const result = await sendWebhook({
    url: hook.url,
    secret: hook.secret,
    event: 'call.test',
    payload: {
      event: 'call.test',
      timestamp: now.toISOString(),
      data: {
        callId: '00000000-0000-0000-0000-000000000000',
        agentId: '00000000-0000-0000-0000-000000000001',
        agentName: 'Aida',
        phoneNumber: '+420777123456',
        durationSeconds: 154,
        endedReason: 'customer-ended-call',
        summary: 'Test call from Receptio.',
        startedAt: new Date(now.getTime() - 154000).toISOString(),
        endedAt: now.toISOString(),
      },
    },
  })

  return NextResponse.json(result.ok ? { ok: true, status: result.status } : { ok: false, error: result.error })
}
