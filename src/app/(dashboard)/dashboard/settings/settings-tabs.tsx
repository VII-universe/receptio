'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, CalendarDays, KeyRound, SlidersHorizontal, User, Webhook } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isSettingsTab, type SettingsTab } from '@/lib/tabs'

/** Záložky nastavení; aktivní záložka je v URL (?tab=…), aby na ni šlo odkázat. */
export function SettingsTabs({
  initialTab,
  general,
  notifications,
  calendars,
  profile,
  api,
  webhooks,
}: {
  initialTab: SettingsTab
  general: ReactNode
  notifications: ReactNode
  calendars: ReactNode
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
        <TabsTrigger value="obecne"><SlidersHorizontal />{t('tabGeneral')}</TabsTrigger>
        <TabsTrigger value="notifikace"><Bell />{t('tabNotifications')}</TabsTrigger>
        <TabsTrigger value="kalendare"><CalendarDays />{t('tabCalendars')}</TabsTrigger>
        <TabsTrigger value="profil"><User />{t('tabProfile')}</TabsTrigger>
        <TabsTrigger value="api"><KeyRound />API</TabsTrigger>
        <TabsTrigger value="webhooky"><Webhook />{t('webhooks')}</TabsTrigger>
      </TabsList>
      {/* keepMounted: přepnutí záložky nesmí zahodit rozepsané změny */}
      <TabsContent value="obecne" keepMounted className="pt-6">
        {general}
      </TabsContent>
      <TabsContent value="notifikace" keepMounted className="pt-6">
        {notifications}
      </TabsContent>
      <TabsContent value="kalendare" keepMounted className="pt-6">
        {calendars}
      </TabsContent>
      <TabsContent value="profil" keepMounted className="pt-6">
        {profile}
      </TabsContent>
      <TabsContent value="api" keepMounted className="pt-6">
        {api}
      </TabsContent>
      <TabsContent value="webhooky" keepMounted className="pt-6">
        {webhooks}
      </TabsContent>
    </Tabs>
  )
}
