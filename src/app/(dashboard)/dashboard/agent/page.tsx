import { redirect } from 'next/navigation'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/constants'
import { getCurrentWorkspace } from '@/lib/auth'
import { getAgentByWorkspaceId, getIndustryTemplates } from '@/lib/supabase/queries'
import { AgentForm, type AgentFormValues } from './agent-form'

export const metadata = { title: 'Můj asistent' }

export default async function AgentPage() {
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/dashboard/setup')

  const agent = await getAgentByWorkspaceId(workspace.id)

  let initial: AgentFormValues
  if (agent) {
    initial = {
      name: agent.name,
      language: agent.language,
      greetingMessage: agent.greeting_message ?? '',
      fallbackPhone: agent.fallback_phone ?? '',
      businessHours: agent.business_hours,
      customInstructions: agent.custom_instructions ?? '',
      faq: agent.faq ?? [],
    }
  } else {
    // Nový agent: předvyplň z šablony oboru (pokud existuje).
    const template = (await getIndustryTemplates(workspace.industry))?.[0]
    initial = {
      name: 'Aida',
      language: 'cs',
      greetingMessage: template?.greeting_message.replaceAll('[název firmy]', workspace.name) ?? '',
      fallbackPhone: '',
      businessHours: DEFAULT_BUSINESS_HOURS,
      customInstructions: template?.custom_instructions ?? '',
      faq: template?.faq ?? [],
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">
        {agent ? 'Upravit asistenta' : 'Vytvořit asistenta'}
      </h1>
      <AgentForm initial={initial} exists={!!agent} />
    </div>
  )
}
