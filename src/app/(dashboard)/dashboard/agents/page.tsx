import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bot, Plus } from 'lucide-react'
import { DeleteAgentButton } from '@/components/agents/delete-agent-button'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getWorkspaceContext } from '@/lib/auth'
import { getLanguage } from '@/lib/languages'
import { getAgentsByWorkspaceId } from '@/lib/supabase/queries'
import { agentsLimitFor } from '@/lib/stripe/plans'

export const metadata = { title: 'Agents' }

export default async function AgentsPage() {
  const ctx = await getWorkspaceContext()
  if (!ctx) redirect('/onboarding')
  const { workspace } = ctx
  const canManage = ctx.role === 'admin'

  const agents = await getAgentsByWorkspaceId(workspace.id)
  const limit = agentsLimitFor(workspace.plan)
  const limitReached = agents.length >= limit

  const newButton = !canManage ? null : limitReached ? (
    <span title="You have reached the agent limit for your plan">
      <Button disabled>
        <Plus /> New agent
      </Button>
    </span>
  ) : (
    <Link href="/dashboard/agents/new" className={buttonVariants()}>
      <Plus /> New agent
    </Link>
  )

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Your agents</h1>
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
            <p className="text-lg font-medium">You do not have any agents yet</p>
            {canManage && (
              <Link href="/dashboard/agents/new" className={buttonVariants()}>
                Create your first agent
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {canManage ? (
                        <Link href={`/dashboard/agents/${a.id}`} className="hover:underline">
                          {a.name}
                        </Link>
                      ) : (
                        a.name
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" title={getLanguage(a.language).name}>
                      {getLanguage(a.language).flag} {a.language.split('-')[0].toUpperCase()}
                      {a.language.includes('-') && <span className="text-xs text-muted-foreground"> ({a.language.split('-')[1]})</span>}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${a.is_active ? 'bg-green-500' : 'bg-red-500'}`}
                          aria-hidden
                        />
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString('en-GB', { timeZone: 'Europe/Prague' })}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <>
                          <Link
                            href={`/dashboard/agents/${a.id}`}
                            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                          >
                            Edit
                          </Link>
                          <DeleteAgentButton agentId={a.id} name={a.name} />
                        </>
                      )}
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
