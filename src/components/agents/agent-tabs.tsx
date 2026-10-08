'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { BookOpen, CalendarClock, Clock, PhoneCall, PhoneForwarded, Settings2 } from 'lucide-react'
import { AvailabilityTab } from '@/components/agents/availability-tab'
import { CallsTab } from '@/components/agents/calls-tab'
import { KnowledgeManager } from '@/components/agents/knowledge-manager'
import { RedirectRulesTab } from '@/components/agents/redirect-rules-tab'
import { WorkingHoursTab } from '@/components/agents/working-hours-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isAgentTab, type AgentTab } from '@/lib/tabs'
import type { KnowledgeEntry } from '@/types'

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
  const t = useTranslations('agents')
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
        <TabsTrigger value="nastaveni"><Settings2 />{t('tabSettings')}</TabsTrigger>
        <TabsTrigger value="pracovni-doba"><Clock />{t('tabHours')}</TabsTrigger>
        <TabsTrigger value="znalostni-baze"><BookOpen />{t('tabKnowledge')}</TabsTrigger>
        <TabsTrigger value="presmerovani"><PhoneForwarded />{t('tabRedirect')}</TabsTrigger>
        <TabsTrigger value="dostupnost"><CalendarClock />{t('tabAvailability')}</TabsTrigger>
        <TabsTrigger value="hovory"><PhoneCall />{t('tabCalls')}</TabsTrigger>
      </TabsList>

      <TabsContent value="nastaveni" keepMounted className="pt-6">
        {settings}
      </TabsContent>

      <TabsContent value="pracovni-doba" keepMounted className="pt-6">
        <WorkingHoursTab agentId={agentId} vapiLinked={vapiLinked} />
      </TabsContent>

      <TabsContent value="znalostni-baze" keepMounted className="pt-6">
        <KnowledgeManager
          agentId={agentId}
          initialEntries={entries}
          initialSyncedAt={knowledgeSyncedAt}
          vapiLinked={vapiLinked}
          onOpenWorkingHours={() => select('pracovni-doba')}
          refreshToken={knowledgeVisits}
        />
      </TabsContent>
      <TabsContent value="presmerovani" keepMounted className="pt-6">
        <RedirectRulesTab agentId={agentId} vapiLinked={vapiLinked} />
      </TabsContent>
      <TabsContent value="dostupnost" keepMounted className="pt-6">
        <AvailabilityTab agentId={agentId} />
      </TabsContent>
      <TabsContent value="hovory" className="pt-6">
        <CallsTab agentId={agentId} />
      </TabsContent>
    </Tabs>
  )
}
