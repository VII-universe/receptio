import { notFound, redirect } from 'next/navigation'
import { AgentForm } from '@/components/agents/agent-form'
import { KnowledgeManager } from '@/components/agents/knowledge-manager'
import { WorkingHoursForm } from '@/components/agents/working-hours-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getKnowledgeEntries, getWorkingHours } from '@/lib/agents/sync-knowledge'
import { DEFAULT_OUTSIDE_MESSAGE, fillWorkingHours } from '@/lib/agents/working-hours'
import { loadAgentFormData } from '@/lib/agents-service'
import { getCurrentWorkspace } from '@/lib/auth'
import { getAgentById } from '@/lib/supabase/queries'

export const metadata = { title: 'Upravit agenta' }

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/onboarding')

  const agent = await getAgentById(workspace.id, (await params).id)
  if (!agent) notFound()

  const [{ form, source }, entries, hourRows] = await Promise.all([
    loadAgentFormData(agent),
    getKnowledgeEntries(workspace.id, agent.id).catch(() => []),
    getWorkingHours(workspace.id, agent.id).catch(() => []),
  ])

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold">{agent.name}</h1>
      {source === 'db' && agent.vapi_agent_id && (
        <p className="mb-4 text-sm text-muted-foreground">
          Data z Vapi se nepodařilo načíst, zobrazuje se poslední uložená verze.
        </p>
      )}

      {/* keepMounted: přepnutí záložky nesmí zahodit rozepsané změny */}
      <Tabs defaultValue="settings" className="mt-4">
        <TabsList>
          <TabsTrigger value="settings">Nastavení</TabsTrigger>
          <TabsTrigger value="hours">Pracovní doba</TabsTrigger>
          <TabsTrigger value="knowledge">Znalostní báze</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" keepMounted className="pt-4">
          {/* key: po uložení se formulář znovu inicializuje čerstvými daty */}
          <AgentForm key={JSON.stringify(form)} initial={form} agentId={agent.id} />
        </TabsContent>

        <TabsContent value="hours" keepMounted className="pt-4">
          <WorkingHoursForm
            agentId={agent.id}
            initialHours={fillWorkingHours(hourRows)}
            initialTimezone={agent.timezone ?? 'Europe/Prague'}
            initialMessage={agent.outside_hours_message ?? DEFAULT_OUTSIDE_MESSAGE}
            vapiLinked={!!agent.vapi_agent_id}
          />
        </TabsContent>

        <TabsContent value="knowledge" keepMounted className="pt-4">
          <KnowledgeManager
            agentId={agent.id}
            initialEntries={entries}
            initialSyncedAt={agent.knowledge_synced_at ?? null}
            vapiLinked={!!agent.vapi_agent_id}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
