import { notFound, redirect } from 'next/navigation'
import { AgentForm } from '@/components/agents/agent-form'
import { loadAgentFormData } from '@/lib/agents-service'
import { getCurrentWorkspace } from '@/lib/auth'
import { getAgentById } from '@/lib/supabase/queries'

export const metadata = { title: 'Upravit agenta' }

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/onboarding')

  const agent = await getAgentById(workspace.id, (await params).id)
  if (!agent) notFound()

  const { form, source } = await loadAgentFormData(agent)

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold">{agent.name}</h1>
      {source === 'db' && agent.vapi_agent_id && (
        <p className="mb-4 text-sm text-muted-foreground">
          Data z Vapi se nepodařilo načíst, zobrazuje se poslední uložená verze.
        </p>
      )}
      {/* key: po uložení se formulář znovu inicializuje čerstvými daty */}
      <AgentForm key={JSON.stringify(form)} initial={form} agentId={agent.id} />
    </div>
  )
}
