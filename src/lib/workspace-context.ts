import 'server-only'
import { cache } from 'react'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { getWorkspaceByClerkOrgId, getWorkspaceByClerkUserId } from '@/lib/supabase/queries'
import type { Workspace } from '@/types'

export type WorkspaceRole = 'admin' | 'member'

export interface WorkspaceContext {
  userId: string
  workspace: Workspace
  role: WorkspaceRole
  /** Je přihlášený uživatel zakladatel workspace? */
  isOwner: boolean
}

// Jen org:admin má plná práva; jakákoli jiná role (včetně neznámé) se bere jako člen.
const roleOf = (orgRole: string | null | undefined): WorkspaceRole => (orgRole === 'org:admin' ? 'admin' : 'member')

/**
 * Workspace přihlášeného uživatele a jeho role. Pořadí:
 *  1. aktivní organizace v session (člen týmu),
 *  2. vlastní workspace (zakladatel = admin),
 *  3. členství v organizaci, která má workspace (pozvaný člen bez aktivní organizace).
 * V rámci jednoho požadavku se vyhodnotí jen jednou.
 */
export const resolveWorkspaceContext = cache(async (): Promise<WorkspaceContext | null> => {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return null

  if (orgId) {
    const ws = await getWorkspaceByClerkOrgId(orgId)
    if (ws) return { userId, workspace: ws, role: roleOf(orgRole), isOwner: ws.clerk_user_id === userId }
  }

  const own = await getWorkspaceByClerkUserId(userId)
  if (own) return { userId, workspace: own, role: 'admin', isOwner: true }

  try {
    const client = await clerkClient()
    const { data } = await client.users.getOrganizationMembershipList({ userId, limit: 100 })
    for (const m of data) {
      const ws = await getWorkspaceByClerkOrgId(m.organization.id)
      if (ws) return { userId, workspace: ws, role: roleOf(m.role), isOwner: false }
    }
  } catch (e) {
    console.error('Clerk: failed to load organization memberships', e)
  }
  return null
})
