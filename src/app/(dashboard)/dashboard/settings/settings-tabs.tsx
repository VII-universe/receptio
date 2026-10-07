'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isSettingsTab, type SettingsTab } from '@/lib/tabs'

/** Záložky nastavení; aktivní záložka je v URL (?tab=…), aby na ni šlo odkázat. */
export function SettingsTabs({
  initialTab,
  general,
  notifications,
  profile,
  api,
  webhooks,
}: {
  initialTab: SettingsTab
  general: ReactNode
  notifications: ReactNode
  profile: ReactNode
  api: ReactNode
  webhooks: ReactNode
}) {
  const t = useTranslations('settings')
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
        <TabsTrigger value="obecne">{t('tabGeneral')}</TabsTrigger>
        <TabsTrigger value="notifikace">{t('tabNotifications')}</TabsTrigger>
        <TabsTrigger value="profil">{t('tabProfile')}</TabsTrigger>
        <TabsTrigger value="api">API</TabsTrigger>
        <TabsTrigger value="webhooky">{t('webhooks')}</TabsTrigger>
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
      <TabsContent value="webhooky" keepMounted className="pt-4">
        {webhooks}
      </TabsContent>
    </Tabs>
  )
}
