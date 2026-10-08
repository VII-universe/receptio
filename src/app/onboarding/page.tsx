import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentsByWorkspaceId } from '@/lib/supabase/queries'
import { resolveWorkspaceContext } from '@/lib/workspace-context'
import { getWorkspaceLocale } from '@/lib/locale/get-workspace-locale'
import { agentLanguageForLocale } from '@/lib/vapi/locale-map'
import { Wizard } from './wizard'

export async function generateMetadata() {
  return { title: (await getTranslations('onboarding'))('metaTitle') }
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const stepParam = Number((await searchParams).step)
  const initialStep = stepParam === 2 || stepParam === 3 ? stepParam : stepParam === 1 ? 1 : null

  const ctx = await resolveWorkspaceContext()
  const workspace = ctx?.workspace
  let agent: { id: string; name: string } | null = null
  let hasPhoneNumber = false
  if (workspace) {
    // členové týmu onboarding nedělají, workspace už nastavil vlastník
    if (ctx.role !== 'admin') redirect('/dashboard')

    const agents = await getAgentsByWorkspaceId(workspace.id)
    const completed = workspace.onboarding_completed !== false
    // Dokončený onboarding se znovu neukazuje; výjimkou je návrat na krok 2 nebo 3 (zkouška agenta a závěr),
    // protože workspace se dokončuje už po vytvoření agenta, aby měl zkušební dobu pro testovací hovor.
    if (completed && !(agents.length > 0 && (initialStep === 2 || initialStep === 3))) redirect('/dashboard')
    if (agents.length > 0) {
      agent = { id: agents[0].id, name: agents[0].name }
      const { count } = await createAdminClient().from('phone_numbers').select('id', { count: 'exact', head: true }).eq('agent_id', agents[0].id)
      hasPhoneNumber = (count ?? 0) > 0
    }

    // Workspace i agent už existují, ale onboarding nebyl dokončen (např. spadlo volání po vytvoření agenta)
    // -> onboarding dokončíme za uživatele.
    if (!completed && agents.length > 0) {
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

  // Výchozí jazyk agenta = jazyk, ve kterém uživatel onboardingem prochází (workspace / cookie).
  return (
    <Wizard
      defaultLanguage={agentLanguageForLocale(await getWorkspaceLocale())}
      userId={userId}
      initialAgent={agent}
      initialStep={initialStep}
      hasPhoneNumber={hasPhoneNumber}
    />
  )
}
