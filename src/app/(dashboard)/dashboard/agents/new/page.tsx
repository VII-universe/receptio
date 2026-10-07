import { redirect } from 'next/navigation'
import { AgentForm } from '@/components/agents/agent-form'
import { DEFAULT_BUSINESS_HOURS, DEFAULT_END_CALL_PHRASES, VOICES } from '@/lib/constants'
import { getAdminWorkspace } from '@/lib/auth'
import { getAgentsByWorkspaceId, getIndustryTemplates } from '@/lib/supabase/queries'
import { agentsLimitFor } from '@/lib/stripe/plans'
import { buildSystemPrompt } from '@/lib/agent-prompt'

export const metadata = { title: 'Nový agent' }

export default async function NewAgentPage() {
  const workspace = await getAdminWorkspace()
  if (!workspace) redirect('/onboarding')

  const agents = await getAgentsByWorkspaceId(workspace.id)
  if (agents.length >= agentsLimitFor(workspace.plan)) redirect('/dashboard/agents')

  // Předvyplnění z šablony oboru (pokud existuje); uživatel vše může upravit.
  const template = (await getIndustryTemplates(workspace.industry))?.[0]
  const systemPrompt = template
    ? buildSystemPrompt({
        name: 'Aida',
        language: 'cs',
        customInstructions: template.custom_instructions,
        faq: template.faq,
        businessHours: DEFAULT_BUSINESS_HOURS,
      })
    : ''

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Nový agent</h1>
      <AgentForm
        initial={{
          name: 'Aida',
          firstMessage: template?.greeting_message.replaceAll('[název firmy]', workspace.name) ?? '',
          systemPrompt,
          language: 'cs',
          voiceId: VOICES.cs[0].id,
          endCallPhrases: DEFAULT_END_CALL_PHRASES,
        }}
      />
    </div>
  )
}
