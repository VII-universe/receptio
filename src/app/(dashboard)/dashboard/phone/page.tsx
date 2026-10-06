import Link from 'next/link'
import { redirect } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentWorkspace } from '@/lib/auth'
import { getAgentByWorkspaceId } from '@/lib/supabase/queries'
import { PhoneManager } from './phone-manager'

export const metadata = { title: 'Telefon' }

export default async function PhonePage() {
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/dashboard/setup')
  const agent = await getAgentByWorkspaceId(workspace.id)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Telefon</h1>

      {!agent || !agent.vapi_agent_id ? (
        <Card>
          <CardHeader>
            <CardTitle>Nejdřív nastavte asistenta</CardTitle>
            <CardDescription>
              Telefonní číslo se přiřazuje asistentovi propojenému s Vapi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/agent" className={buttonVariants()}>
              Nastavit asistenta
            </Link>
          </CardContent>
        </Card>
      ) : (
        <PhoneManager phoneNumber={agent.phone_number} />
      )}
    </div>
  )
}
