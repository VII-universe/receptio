'use client'

import { useState, type ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type SettingsTab = 'obecne' | 'notifikace' | 'profil' | 'api'

export const isSettingsTab = (v: unknown): v is SettingsTab =>
  v === 'obecne' || v === 'notifikace' || v === 'profil' || v === 'api'

/** Záložky nastavení; aktivní záložka je v URL (?tab=…), aby na ni šlo odkázat. */
export function SettingsTabs({
  initialTab,
  general,
  notifications,
  profile,
  api,
}: {
  initialTab: SettingsTab
  general: ReactNode
  notifications: ReactNode
  profile: ReactNode
  api: ReactNode
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab)

  function select(next: SettingsTab) {
    setTab(next)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', next)
    window.history.replaceState(null, '', url)
  }

  return (
    <Tabs value={tab} onValueChange={(v) => isSettingsTab(v) && select(v)}>
      <TabsList>
        <TabsTrigger value="obecne">Obecné</TabsTrigger>
        <TabsTrigger value="notifikace">Notifikace</TabsTrigger>
        <TabsTrigger value="profil">Profil</TabsTrigger>
        <TabsTrigger value="api">API</TabsTrigger>
      </TabsList>
      {/* keepMounted: přepnutí záložky nesmí zahodit rozepsané změny */}
      <TabsContent value="obecne" keepMounted className="pt-4">
        {general}
      </TabsContent>
      <TabsContent value="notifikace" keepMounted className="pt-4">
        {notifications}
      </TabsContent>
      <TabsContent value="profil" keepMounted className="pt-4">
        {profile}
      </TabsContent>
      <TabsContent value="api" keepMounted className="pt-4">
        {api}
      </TabsContent>
    </Tabs>
  )
}
