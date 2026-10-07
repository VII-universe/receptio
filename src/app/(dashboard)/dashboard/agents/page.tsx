import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bot, Plus } from 'lucide-react'
import { DeleteAgentButton } from '@/components/agents/delete-agent-button'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getCurrentWorkspace } from '@/lib/auth'
import { getAgentsByWorkspaceId } from '@/lib/supabase/queries'
import { agentsLimitFor } from '@/lib/stripe/plans'

export const metadata = { title: 'Agenti' }

export default async function AgentsPage() {
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/onboarding')

  const agents = await getAgentsByWorkspaceId(workspace.id)
  const limit = agentsLimitFor(workspace.plan)
  const limitReached = agents.length >= limit

  const newButton = limitReached ? (
    <span title="Dosáhli jste limitu agentů pro váš plán">
      <Button disabled>
        <Plus /> Nový agent
      </Button>
    </span>
  ) : (
    <Link href="/dashboard/agents/new" className={buttonVariants()}>
      <Plus /> Nový agent
    </Link>
  )

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Vaši agenti</h1>
          <Badge variant="secondary">
            {agents.length} / {limit}
          </Badge>
        </div>
        {agents.length > 0 && newButton}
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <Bot className="size-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">Zatím nemáte žádného agenta</p>
            <Link href="/dashboard/agents/new" className={buttonVariants()}>
              Vytvořit prvního agenta
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead>Datum vytvoření</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/agents/${a.id}`} className="hover:underline">
                        {a.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${a.is_active ? 'bg-green-500' : 'bg-red-500'}`}
                          aria-hidden
                        />
                        {a.is_active ? 'Aktivní' : 'Neaktivní'}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/agents/${a.id}`}
                        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                      >
                        Upravit
                      </Link>
                      <DeleteAgentButton agentId={a.id} name={a.name} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
