import { redirect } from 'next/navigation'
import { getCurrentWorkspace } from '@/lib/auth'
import { getPhoneNumbersByWorkspaceId } from '@/lib/phone-numbers'
import { getAgentsByWorkspaceId } from '@/lib/supabase/queries'
import { PHONE_NUMBER_MONTHLY_COST, phoneNumbersLimitFor } from '@/lib/stripe/plans'
import { PhoneNumbers } from './phone-numbers'

export const metadata = { title: 'Telefon' }

export default async function TelefonPage() {
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/dashboard/setup')

  const [numbers, agents] = await Promise.all([
    getPhoneNumbersByWorkspaceId(workspace.id),
    getAgentsByWorkspaceId(workspace.id),
  ])
  const limit = phoneNumbersLimitFor(workspace.plan)

  const withNumber = new Set(numbers.map((n) => n.agent_id))
  // Číslo lze přiřadit jen agentovi propojenému s Vapi, který ještě žádné nemá.
  const assignable = agents
    .filter((a) => a.vapi_agent_id && !withNumber.has(a.id))
    .map((a) => ({ id: a.id, name: a.name }))

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold">Telefon</h1>
      <PhoneNumbers
        numbers={numbers.map((n) => ({
          id: n.id,
          phoneNumber: n.phone_number,
          agentName: n.agent?.name ?? null,
          isActive: n.is_active,
          monthlyCost: Number(n.monthly_cost),
        }))}
        assignableAgents={assignable}
        hasAgents={agents.length > 0}
        planAllowsNumbers={limit > 0}
        limitReached={numbers.length >= limit}
        monthlyPrice={PHONE_NUMBER_MONTHLY_COST}
      />
    </div>
  )
}
