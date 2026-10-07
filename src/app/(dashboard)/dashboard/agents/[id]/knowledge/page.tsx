import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { getKnowledgeEntries } from '@/lib/agents/sync-knowledge'
import { getAdminWorkspace } from '@/lib/auth'
import { getAgentById } from '@/lib/supabase/queries'
import { cn } from '@/lib/utils'
import { KnowledgeManager } from '@/components/agents/knowledge-manager'

export const metadata = { title: 'Knowledge Base' }

export default async function KnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const workspace = await getAdminWorkspace()
  if (!workspace) redirect('/onboarding')

  const agent = await getAgentById(workspace.id, (await params).id)
  if (!agent) notFound()
  const entries = await getKnowledgeEntries(workspace.id, agent.id)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Knowledge Base – {agent.name}</h1>
        <Link href={`/dashboard/agents/${agent.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          <ArrowLeft /> Back to agent
        </Link>
      </div>
      <KnowledgeManager
        agentId={agent.id}
        initialEntries={entries}
        initialSyncedAt={agent.knowledge_synced_at ?? null}
        vapiLinked={!!agent.vapi_agent_id}
      />
    </div>
  )
}
