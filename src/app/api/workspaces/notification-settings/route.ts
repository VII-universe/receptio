import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { E164, EMAIL, normalizePhone } from '@/lib/notification-schema'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/workspaces/notification-settings
// Body: { notificationEmail: string | null, notificationSms: string | null, notificationsEnabled?: boolean }
// Workspace se bere z Clerk session; prázdný řetězec nebo null hodnotu smaže, vynechané pole se nemění.
export async function PATCH(request: Request) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response

  const body = await request.json().catch(() => null)
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const update: Record<string, string | boolean | null> = {}

  if ('notificationEmail' in body) {
    const v = typeof body.notificationEmail === 'string' ? body.notificationEmail.trim() : body.notificationEmail
    if (v !== null && (typeof v !== 'string' || (v !== '' && !EMAIL.test(v)))) {
      return NextResponse.json({ error: 'Neplatný email' }, { status: 400 })
    }
    update.notification_email = v || null
  }
  if ('notificationSms' in body) {
    const v = typeof body.notificationSms === 'string' ? normalizePhone(body.notificationSms) : body.notificationSms
    if (v !== null && (typeof v !== 'string' || (v !== '' && !E164.test(v)))) {
      return NextResponse.json({ error: 'Telefon zadejte ve tvaru +420777123456' }, { status: 400 })
    }
    update.notification_phone = v || null // SMS číslo je ve sloupci notification_phone
  }
  if ('notificationsEnabled' in body) {
    if (typeof body.notificationsEnabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    update.notifications_enabled = body.notificationsEnabled
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await createAdminClient().from('workspaces').update(update).eq('id', ctx.workspace.id)
  if (error) {
    console.error('Failed to update notification settings', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
