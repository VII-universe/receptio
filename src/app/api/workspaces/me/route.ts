import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceByClerkUserId } from '@/lib/supabase/queries'

// GET /api/workspaces/me
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const workspace = await getWorkspaceByClerkUserId(userId)
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }
  return NextResponse.json({ workspace })
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const E164 = /^\+[1-9]\d{7,14}$/

// PATCH /api/workspaces/me
// Body (vše volitelné): { notification_email, notification_phone, notifications_enabled }
// Prázdný řetězec nebo null hodnotu smaže; vynechané pole se nemění.
export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const workspace = await getWorkspaceByClerkUserId(userId)
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const update: Record<string, string | boolean | null> = {}

  if ('notification_email' in body) {
    const v = typeof body.notification_email === 'string' ? body.notification_email.trim() : body.notification_email
    if (v !== null && (typeof v !== 'string' || (v !== '' && !EMAIL.test(v)))) {
      return NextResponse.json({ error: 'Neplatný email' }, { status: 400 })
    }
    update.notification_email = v || null
  }
  if ('notification_phone' in body) {
    const v = typeof body.notification_phone === 'string' ? body.notification_phone.replace(/\s+/g, '') : body.notification_phone
    if (v !== null && (typeof v !== 'string' || (v !== '' && !E164.test(v)))) {
      return NextResponse.json(
        { error: 'Telefon zadejte v mezinárodním formátu, např. +420123456789' },
        { status: 400 }
      )
    }
    update.notification_phone = v || null
  }
  if ('notifications_enabled' in body) {
    if (typeof body.notifications_enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    update.notifications_enabled = body.notifications_enabled
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await createAdminClient()
    .from('workspaces')
    .update(update)
    .eq('id', workspace.id)
    .select('*')
    .single()
  if (error) {
    console.error('Failed to update workspace', error)
    return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 })
  }
  return NextResponse.json({ workspace: data })
}
