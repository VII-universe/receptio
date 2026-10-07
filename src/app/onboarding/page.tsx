import { redirect } from 'next/navigation'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentsByWorkspaceId } from '@/lib/supabase/queries'
import { resolveWorkspaceContext } from '@/lib/workspace-context'
import { Wizard } from './wizard'

export const metadata = { title: 'Začínáme' }

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const ctx = await resolveWorkspaceContext()
  const workspace = ctx?.workspace
  if (workspace) {
    // členové týmu onboarding nedělají, workspace už nastavil vlastník
    if (ctx.role !== 'admin' || workspace.onboarding_completed !== false) redirect('/dashboard')

    // Workspace i agent už existují (např. přerušený wizard) -> onboarding dokončíme za uživatele.
    if ((await getAgentsByWorkspaceId(workspace.id)).length > 0) {
      const { error } = await createAdminClient()
        .from('workspaces')
        .update({ onboarding_completed: true })
        .eq('id', workspace.id)
      if (!error) {
        await (await clerkClient()).users
          .updateUserMetadata(userId, { publicMetadata: { onboardingCompleted: true } })
          .catch((e) => console.error('Clerk: failed to update metadata', e))
        redirect('/dashboard')
      }
    }
  }

  return <Wizard />
}
