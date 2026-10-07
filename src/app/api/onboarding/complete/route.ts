import { after, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server'
import { isLocale } from '@/i18n/routing'
import { sendWelcomeEmail } from '@/lib/email/send-welcome'
import { createAdminClient } from '@/lib/supabase/admin'
import { seedWorkingHours } from '@/lib/agents/default-working-hours'
import { getKnowledgeEntries, syncAgentKnowledge } from '@/lib/agents/sync-knowledge'
import { isBusinessType, knowledgeSeedFor, workingHoursFor } from '@/lib/onboarding'
import { getAgentsByWorkspaceId } from '@/lib/supabase/queries'
import { resolveWorkspaceContext } from '@/lib/workspace-context'

// POST /api/onboarding/complete  Body: { businessName, businessType }
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await resolveWorkspaceContext()
  if (!ctx) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'You do not have permission to do this' }, { status: 403 })
  const workspace = ctx.workspace

  const body = await request.json().catch(() => null)
  const businessName = typeof body?.businessName === 'string' ? body.businessName.trim() : ''
  if (businessName.length < 2 || businessName.length > 100 || !isBusinessType(body?.businessType)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Jazyk, ve kterém uživatel prošel onboardingem (cookie `locale` z marketingu), se uloží do workspace;
  // podle něj se pak posílají e-maily i zobrazuje dashboard. Jen při prvním dokončení.
  const cookieLocale = (await cookies()).get('locale')?.value
  const locale = workspace.onboarding_completed === false && isLocale(cookieLocale) ? cookieLocale : undefined

  const { error } = await createAdminClient()
    .from('workspaces')
    .update({
      business_name: businessName,
      business_type: body.businessType,
      onboarding_completed: true,
      ...(locale ? { locale } : {}),
    })
    .eq('id', workspace.id)
  if (error) {
    console.error('Failed to complete onboarding', error)
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }

  // Úvodní znalostní báze podle oboru pro nového agenta. Chyba nesmí zabránit dokončení onboardingu.
  try {
    const agent = (await getAgentsByWorkspaceId(workspace.id))[0]
    if (agent && (await getKnowledgeEntries(workspace.id, agent.id)).length === 0) {
      // Výchozí hodiny z vytvoření agenta se přepíšou typickými pro obor (jen u nového agenta bez znalostí).
      const hours = workingHoursFor(body.businessType)
      if (hours) {
        const { error: hoursError } = await createAdminClient()
          .from('working_hours')
          .upsert(
            hours.map((h) => ({ ...h, agent_id: agent.id, workspace_id: workspace.id })),
            { onConflict: 'agent_id,day_of_week' }
          )
        if (hoursError) throw hoursError
      } else {
        await seedWorkingHours(agent.id, workspace.id)
      }
      const seeds = knowledgeSeedFor(body.businessType, businessName)
      const { error: seedError } = await createAdminClient()
        .from('knowledge_entries')
        .insert(seeds.map((e, i) => ({ ...e, agent_id: agent.id, workspace_id: workspace.id, sort_order: i })))
      if (seedError) throw seedError
      await syncAgentKnowledge(agent)
    }
  } catch (e) {
    console.error('Onboarding: failed to seed knowledge base', e)
  }

  // Zdroj pravdy je databáze; Clerk metadata jsou jen pomocná kopie (např. pro budoucí middleware).
  try {
    await (await clerkClient()).users.updateUserMetadata(userId, { publicMetadata: { onboardingCompleted: true } })
  } catch (e) {
    console.error('Clerk: failed to update metadata', e)
  }
  // Uvítací e-mail se posílá jen při přechodu na dokončený onboarding (ne při opakovaném volání).
  if (workspace.onboarding_completed === false) {
    after(async () => {
      try {
        const user = await currentUser()
        const email = user?.primaryEmailAddress?.emailAddress
        if (!email) return
        const agentName = (await getAgentsByWorkspaceId(workspace.id))[0]?.name ?? 'Aida'
        await sendWelcomeEmail({ workspaceId: workspace.id, email, ownerName: user.firstName ?? '', agentName })
      } catch (e) {
        console.error('Onboarding: welcome email failed', e)
      }
    })
  }

  return NextResponse.json({ ok: true })
}
