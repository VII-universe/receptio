import { redirect } from 'next/navigation'
import { effectivePlan } from '@/lib/billing/get-workspace-plan'
import { getTranslations } from 'next-intl/server'
import { getAdminWorkspace } from '@/lib/auth'
import { getPhoneNumbersByWorkspaceId } from '@/lib/phone-numbers'
import { getAgentsByWorkspaceId } from '@/lib/supabase/queries'
import { phoneNumbersLimitFor } from '@/lib/stripe/plans'
import { PhoneNumbers } from './phone-numbers'

export async function generateMetadata() {
  return { title: (await getTranslations('nav'))('phoneNumbers') }
}

export default async function PhoneNumbersPage() {
  const tn = await getTranslations('nav')
  const workspace = await getAdminWorkspace()
  if (!workspace) redirect('/onboarding')

  const [numbers, agents] = await Promise.all([
    getPhoneNumbersByWorkspaceId(workspace.id),
    getAgentsByWorkspaceId(workspace.id),
  ])
  const limit = phoneNumbersLimitFor(effectivePlan(workspace.plan, workspace.plan_status, workspace.trial_ends_at))

  const withNumber = new Set(numbers.map((n) => n.agent_id))
  // Číslo lze přiřadit jen agentovi propojenému s Vapi, který ještě žádné nemá.
  const assignable = agents
    .filter((a) => a.vapi_agent_id && !withNumber.has(a.id))
    .map((a) => ({ id: a.id, name: a.name }))

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold">{tn('phoneNumbers')}</h1>
      <PhoneNumbers
        numbers={numbers.map((n) => ({
          id: n.id,
          phoneNumber: n.phone_number,
          agentName: n.agent?.name ?? null,
          isActive: n.is_active,
          monthlyCost: n.monthly_cost === null ? null : Number(n.monthly_cost),
          costCurrency: n.cost_currency ?? 'CZK',
        }))}
        assignableAgents={assignable}
        hasAgents={agents.length > 0}
        planAllowsNumbers={limit > 0}
        limitReached={numbers.length >= limit}
      />
    </div>
  )
}
