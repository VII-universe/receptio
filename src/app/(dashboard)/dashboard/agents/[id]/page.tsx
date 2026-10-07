import { notFound, redirect } from 'next/navigation'
import { AgentForm } from '@/components/agents/agent-form'
import { AgentTabs } from '@/components/agents/agent-tabs'
import { getKnowledgeEntries } from '@/lib/agents/sync-knowledge'
import { loadAgentFormData } from '@/lib/agents-service'
import { getAdminWorkspace } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentById } from '@/lib/supabase/queries'
import { isAgentTab } from '@/lib/tabs'

export const metadata = { title: 'Upravit agenta' }

export default async function EditAgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const workspace = await getAdminWorkspace()
  if (!workspace) redirect('/onboarding')

  const agent = await getAgentById(workspace.id, (await params).id)
  if (!agent) notFound()
  const { tab } = await searchParams

  const [{ form, source }, entries, phone] = await Promise.all([
    loadAgentFormData(agent),
    getKnowledgeEntries(workspace.id, agent.id).catch(() => []),
    createAdminClient()
      .from('phone_numbers')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .eq('agent_id', agent.id),
  ])
  const hasPhoneNumber = (phone.count ?? 0) > 0

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold">{agent.name}</h1>
      {source === 'db' && agent.vapi_agent_id && (
        <p className="mb-4 text-sm text-muted-foreground">
          Data z Vapi se nepodařilo načíst, zobrazuje se poslední uložená verze.
        </p>
      )}

      <AgentTabs
        initialTab={isAgentTab(tab) ? tab : 'nastaveni'}
        // key: po uložení se formulář znovu inicializuje čerstvými daty
        settings={<AgentForm key={JSON.stringify(form)} initial={form} agentId={agent.id} hasPhoneNumber={hasPhoneNumber} />}
        agentId={agent.id}
        vapiLinked={!!agent.vapi_agent_id}
        entries={entries}
        knowledgeSyncedAt={agent.knowledge_synced_at ?? null}
      />
    </div>
  )
}
