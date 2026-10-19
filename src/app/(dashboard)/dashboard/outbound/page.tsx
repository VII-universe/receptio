import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { OutboundView } from '@/components/outbound/outbound-view'
import { getAdminWorkspace } from '@/lib/auth'
import { planAllowsOutbound } from '@/lib/outbound/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentsByWorkspaceId } from '@/lib/supabase/queries'

export async function generateMetadata() {
  return { title: (await getTranslations('nav'))('outbound') }
}

export default async function OutboundPage() {
  const t = await getTranslations('outbound')
  const workspace = await getAdminWorkspace()
  if (!workspace) redirect('/onboarding')

  const allowed = planAllowsOutbound(workspace)
  const agents = await getAgentsByWorkspaceId(workspace.id)
  const { data: settings } = allowed
    ? await createAdminClient().from('outbound_settings').select('agent_id, gdpr_confirmed').eq('workspace_id', workspace.id)
    : { data: [] }
  const { data: numbers } = await createAdminClient().from('phone_numbers').select('agent_id').eq('workspace_id', workspace.id).not('vapi_phone_number_id', 'is', null)
  const withNumber = new Set((numbers ?? []).map((n) => n.agent_id as string))
  const confirmed = Object.fromEntries((settings ?? []).map((s) => [s.agent_id as string, s.gdpr_confirmed === true]))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="app-title text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <OutboundView
        allowed={allowed}
        businessName={workspace.business_name ?? workspace.name}
        agents={agents.map((a) => ({ id: a.id, name: a.name, gdprConfirmed: confirmed[a.id] === true, hasNumber: withNumber.has(a.id) }))}
      />
    </div>
  )
}
