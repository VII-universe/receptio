import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getAdminWorkspace } from '@/lib/auth'
import { isCurrencyLocked } from '@/lib/billing/currency'
import { isSettingsTab } from '@/lib/tabs'
import { ApiKeysTab } from './api-keys-tab'
import { GeneralSettings } from './general-settings'
import { ProfileTab } from './profile-tab'
import { SettingsForm } from './settings-form'
import { WebhooksTab } from './webhooks-tab'
import { SettingsTabs } from './settings-tabs'

export async function generateMetadata() {
  return { title: (await getTranslations('nav'))('settings') }
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tn = await getTranslations('nav')
  const workspace = await getAdminWorkspace()
  if (!workspace) redirect('/onboarding')
  const { tab } = await searchParams

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 app-title text-2xl font-semibold tracking-tight">{tn('settings')}</h1>
      <SettingsTabs
        initialTab={isSettingsTab(tab) ? tab : 'obecne'}
        general={
          <GeneralSettings
            initial={{
              businessName: workspace.business_name ?? workspace.name,
              businessType: workspace.business_type ?? null,
              timezone: workspace.timezone ?? 'Europe/Prague',
              currency: workspace.currency ?? 'CZK',
            }}
            currencyLocked={isCurrencyLocked(workspace)}
          />
        }
        notifications={
          <SettingsForm
            initial={{
              email: workspace.notification_email ?? '',
              sms: workspace.notification_phone ?? '',
              enabled: workspace.notifications_enabled ?? true,
            }}
          />
        }
        profile={<ProfileTab />}
        api={<ApiKeysTab />}
        webhooks={<WebhooksTab />}
      />
    </div>
  )
}
