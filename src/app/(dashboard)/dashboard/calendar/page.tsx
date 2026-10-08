import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { CalendarView } from '@/components/calendar/calendar-view'
import { getWorkspaceContext } from '@/lib/auth'
import { getAgentsByWorkspaceId } from '@/lib/supabase/queries'

export async function generateMetadata() {
  return { title: (await getTranslations('nav'))('calendar') }
}

export default async function CalendarPage() {
  const t = await getTranslations('calendar')
  const ctx = await getWorkspaceContext()
  if (!ctx) redirect('/onboarding')
  const agents = await getAgentsByWorkspaceId(ctx.workspace.id)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="app-title text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <CalendarView
        agents={agents.map((a) => ({ id: a.id, name: a.name, bookingEnabled: a.booking_enabled ?? false }))}
        timezone={ctx.workspace.timezone ?? 'Europe/Prague'}
      />
    </div>
  )
}
