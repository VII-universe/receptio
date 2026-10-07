import { redirect } from 'next/navigation'
import { getAdminWorkspace } from '@/lib/auth'
import { isCurrencyLocked } from '@/lib/billing/currency'
import { isSettingsTab } from '@/lib/tabs'
import { ApiKeysTab } from './api-keys-tab'
import { GeneralSettings } from './general-settings'
import { ProfileTab } from './profile-tab'
import { SettingsForm } from './settings-form'
import { WebhooksTab } from './webhooks-tab'
import { SettingsTabs } from './settings-tabs'

export const metadata = { title: 'Nastavení' }

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const workspace = await getAdminWorkspace()
  if (!workspace) redirect('/onboarding')
  const { tab } = await searchParams

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Nastavení</h1>
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
