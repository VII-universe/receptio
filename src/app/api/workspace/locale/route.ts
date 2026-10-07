import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLocale } from '@/i18n/routing'

/** Změní jazyk rozhraní workspace (jen admin) a uloží ho i do cookie `locale` jako zálohu. */
export async function PATCH(request: NextRequest) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response

  const body = (await request.json().catch(() => null)) as { locale?: unknown } | null
  if (!isLocale(body?.locale)) {
    return NextResponse.json({ error: 'Unsupported language' }, { status: 400 })
  }

  const { error } = await createAdminClient().from('workspaces').update({ locale: body.locale }).eq('id', ctx.workspace.id)
  if (error) {
    console.error('Workspace locale: update failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const res = NextResponse.json({ locale: body.locale })
  // Záměrně ne httpOnly: čte ho i klient. Obsahuje jen kód jazyka.
  res.cookies.set('locale', body.locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
