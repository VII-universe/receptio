'use client'

import { useState, type ReactNode } from 'react'
import { KnowledgeManager } from '@/components/agents/knowledge-manager'
import { WorkingHoursTab } from '@/components/agents/working-hours-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { KnowledgeEntry } from '@/types'

export type AgentTab = 'nastaveni' | 'pracovni-doba' | 'znalostni-baze'

export const isAgentTab = (v: unknown): v is AgentTab =>
  v === 'nastaveni' || v === 'pracovni-doba' || v === 'znalostni-baze'

/** Záložky detailu agenta; aktivní záložka je v URL (?tab=…), aby na ni šlo odkázat. */
export function AgentTabs({
  initialTab,
  settings,
  agentId,
  vapiLinked,
  entries,
  knowledgeSyncedAt,
}: {
  initialTab: AgentTab
  settings: ReactNode
  agentId: string
  vapiLinked: boolean
  entries: KnowledgeEntry[]
  knowledgeSyncedAt: string | null
}) {
  const [tab, setTab] = useState<AgentTab>(initialTab)
  // Při každém návratu na Znalostní bázi se znovu načte (mezitím upravená) pracovní doba.
  const [knowledgeVisits, setKnowledgeVisits] = useState(0)

  function select(next: AgentTab) {
    setTab(next)
    if (next === 'znalostni-baze') setKnowledgeVisits((n) => n + 1)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', next)
    window.history.replaceState(null, '', url)
  }

  return (
    // keepMounted: přepnutí záložky nesmí zahodit rozepsané změny
    <Tabs value={tab} onValueChange={(v) => isAgentTab(v) && select(v)} className="mt-4">
      <TabsList>
        <TabsTrigger value="nastaveni">Nastavení</TabsTrigger>
        <TabsTrigger value="pracovni-doba">Pracovní doba</TabsTrigger>
        <TabsTrigger value="znalostni-baze">Znalostní báze</TabsTrigger>
      </TabsList>

      <TabsContent value="nastaveni" keepMounted className="pt-4">
        {settings}
      </TabsContent>

      <TabsContent value="pracovni-doba" keepMounted className="pt-4">
        <WorkingHoursTab agentId={agentId} vapiLinked={vapiLinked} />
      </TabsContent>

      <TabsContent value="znalostni-baze" keepMounted className="pt-4">
        <KnowledgeManager
          agentId={agentId}
          initialEntries={entries}
          initialSyncedAt={knowledgeSyncedAt}
          vapiLinked={vapiLinked}
          onOpenWorkingHours={() => select('pracovni-doba')}
          refreshToken={knowledgeVisits}
        />
      </TabsContent>
    </Tabs>
  )
}
