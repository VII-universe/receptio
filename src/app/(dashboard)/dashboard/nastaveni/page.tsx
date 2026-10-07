import { redirect } from 'next/navigation'
import { getCurrentWorkspace } from '@/lib/auth'
import { SettingsForm } from './settings-form'

export const metadata = { title: 'Nastavení' }

export default async function SettingsPage() {
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/onboarding')

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Nastavení</h1>
      <SettingsForm
        initial={{
          email: workspace.notification_email ?? '',
          sms: workspace.notification_phone ?? '',
          enabled: workspace.notifications_enabled ?? true,
        }}
      />
    </div>
  )
}
