import { redirect } from 'next/navigation'
import { effectivePlan } from '@/lib/billing/get-workspace-plan'
import { getTranslations } from 'next-intl/server'
import { AgentForm } from '@/components/agents/agent-form'
import { defaultVoiceFor } from '@/lib/agents/voices'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/constants'
import { getLanguage } from '@/lib/languages'
import { isBusinessType, templateFor } from '@/lib/onboarding'
import { agentLanguageForLocale } from '@/lib/vapi/locale-map'
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
  if (agents.length >= agentsLimitFor(effectivePlan(workspace.plan, workspace.plan_status, workspace.trial_ends_at))) redirect('/dashboard/agents')

  // Jazyk nového agenta = jazyk workspace (existujícím agentům se jazyk nemění); uživatel ho může přepsat.
  const language = agentLanguageForLocale(workspace.locale)
  const lang = getLanguage(language)

  // Čeština: šablona oboru z DB. Ostatní jazyky: anglické šablony z onboardingu (s pozdravem v jazyce agenta).
  const template = language === 'cs' ? (await getIndustryTemplates(workspace.industry))?.[0] : undefined
  const localized = language !== 'cs' && isBusinessType(workspace.business_type) ? templateFor(workspace.business_type, workspace.name, language) : null
  const systemPrompt = localized
    ? localized.systemPrompt
    : template
    ? buildSystemPrompt({
        name: 'Alex',
        language,
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
          firstMessage:
            localized?.firstMessage ??
            template?.greeting_message.replaceAll('[název firmy]', workspace.name) ??
            (language === 'cs' ? '' : lang.greeting(workspace.name)),
          systemPrompt,
          language,
          voiceId: defaultVoiceFor(language),
          endCallPhrases: lang.endPhrases,
        }}
      />
    </div>
  )
}
