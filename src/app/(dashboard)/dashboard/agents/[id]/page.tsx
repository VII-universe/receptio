import { notFound, redirect } from 'next/navigation'
import { Bot } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { AgentForm } from '@/components/agents/agent-form'
import { AgentTabs } from '@/components/agents/agent-tabs'
import { getKnowledgeEntries } from '@/lib/agents/sync-knowledge'
import { loadAgentFormData } from '@/lib/agents-service'
import { getAdminWorkspace } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentById } from '@/lib/supabase/queries'
import { isAgentTab } from '@/lib/tabs'

export async function generateMetadata() {
  return { title: (await getTranslations('agents'))('editTitle') }
}

export default async function EditAgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const t = await getTranslations('agents')
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
    <div className="mx-auto max-w-4xl">
      <div className="mb-2 flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/30" aria-hidden>
          <Bot className="size-6" strokeWidth={1.6} />
        </span>
        <h1 className="app-title text-2xl font-semibold tracking-tight">{agent.name}</h1>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${agent.is_active ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}
        >
          <span className={`size-1.5 rounded-full ${agent.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/60'}`} aria-hidden />
          {agent.is_active ? t('active') : t('inactive')}
        </span>
      </div>
      {source === 'db' && agent.vapi_agent_id && (
        <p className="mb-4 text-sm text-muted-foreground">
          {t('vapiLoadFailed')}
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
