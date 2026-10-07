import 'server-only'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { resolveWorkspaceContext } from '@/lib/workspace-context'

/** Workspace přihlášeného uživatele (null, pokud ještě neprošel onboardingem). */
export async function getCurrentWorkspace() {
  return (await getWorkspaceContext())?.workspace ?? null
}

/** Workspace i role přihlášeného uživatele; nepřihlášeného pošle na přihlášení. */
export async function getWorkspaceContext() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  return resolveWorkspaceContext()
}

/**
 * Pro stránky jen pro adminy (editace agentů, telefon, fakturace, nastavení):
 * člen týmu je přesměrován na přehled s upozorněním "Nemáte oprávnění".
 */
export async function getAdminWorkspace() {
  const ctx = await getWorkspaceContext()
  if (ctx && ctx.role !== 'admin') redirect('/dashboard?denied=1')
  return ctx?.workspace ?? null
}
