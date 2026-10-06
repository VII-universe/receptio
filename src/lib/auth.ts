import 'server-only'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getWorkspaceByClerkUserId } from '@/lib/supabase/queries'

/** Workspace přihlášeného uživatele (null, pokud ještě neprošel setupem). */
export async function getCurrentWorkspace() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  return getWorkspaceByClerkUserId(userId)
}
