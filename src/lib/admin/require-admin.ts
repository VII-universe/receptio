import 'server-only'
import { cache } from 'react'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs/server'

/**
 * Role admin se nastavuje v Clerk Dashboard: Users → vybrat uživatele → Metadata →
 * Public Metadata → { "role": "admin" }.
 * Role se čte přímo z Clerk uživatele (ne ze session tokenu), takže funguje bez další konfigurace
 * a změna role platí okamžitě.
 */
const readAdminUserId = cache(async (): Promise<{ userId: string | null; isAdmin: boolean }> => {
  const { userId } = await auth()
  if (!userId) return { userId: null, isAdmin: false }
  const user = await currentUser()
  return { userId, isAdmin: user?.publicMetadata?.role === 'admin' }
})

/** Pro API routes: vrací userId admina, nebo hotovou odpověď 401 / 403. */
export async function requireAdmin(): Promise<string | Response> {
  const { userId, isAdmin } = await readAdminUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return userId
}

/**
 * Pro stránky a datové funkce admin panelu: ne-admina přesměruje na /dashboard.
 * Volá se v každé stránce, nejen v layoutu (layout se při navigaci mezi stránkami nemusí znovu vykreslit).
 */
export async function requireAdminPage(): Promise<string> {
  const { userId, isAdmin } = await readAdminUserId()
  if (!userId) redirect('/sign-in')
  if (!isAdmin) redirect('/dashboard')
  return userId
}
