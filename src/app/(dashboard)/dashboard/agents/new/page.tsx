import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AgentForm } from '@/components/agents/agent-form'
import { defaultVoiceFor } from '@/lib/agents/voices'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/constants'
import { getLanguage } from '@/lib/languages'
import { getAdminWorkspace } from '@/lib/auth'
import { getAgentsByWorkspaceId, getIndustryTemplates } from '@/lib/supabase/queries'
import { agentsLimitFor } from '@/lib/stripe/plans'
import { buildSystemPrompt } from '@/lib/agent-prompt'

export async function generateMetadata() {
  return { title: (await getTranslations('agents'))('newAgent') }
}

export default async function NewAgentPage() {
  const t = await getTranslations('agents')
  const workspace = await getAdminWorkspace()
  if (!workspace) redirect('/onboarding')

  const agents = await getAgentsByWorkspaceId(workspace.id)
  if (agents.length >= agentsLimitFor(workspace.plan)) redirect('/dashboard/agents')

  // Předvyplnění z šablony oboru (pokud existuje); uživatel vše může upravit.
  const template = (await getIndustryTemplates(workspace.industry))?.[0]
  const systemPrompt = template
    ? buildSystemPrompt({
        name: 'Alex',
        language: 'cs',
        customInstructions: template.custom_instructions,
        faq: template.faq,
        businessHours: DEFAULT_BUSINESS_HOURS,
      })
    : ''

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">{t('newAgent')}</h1>
      <AgentForm
        initial={{
          name: 'Alex',
          firstMessage: template?.greeting_message.replaceAll('[název firmy]', workspace.name) ?? '',
          systemPrompt,
          language: 'cs',
          voiceId: defaultVoiceFor('cs'),
          endCallPhrases: getLanguage('cs').endPhrases,
        }}
      />
    </div>
  )
}
