import Link from 'next/link'
import { effectivePlan } from '@/lib/billing/get-workspace-plan'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
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

export async function generateMetadata() {
  return { title: (await getTranslations('nav'))('agents') }
}

export default async function AgentsPage() {
  const t = await getTranslations('agents')
  const tc = await getTranslations('common')
  const locale = await getLocale()
  const ctx = await getWorkspaceContext()
  if (!ctx) redirect('/onboarding')
  const { workspace } = ctx
  const canManage = ctx.role === 'admin'

  const agents = await getAgentsByWorkspaceId(workspace.id)
  const limit = agentsLimitFor(effectivePlan(workspace.plan, workspace.plan_status, workspace.trial_ends_at))
  const limitReached = agents.length >= limit

  const newButton = !canManage ? null : limitReached ? (
    <span title={t('limitReached')}>
      <Button disabled>
        <Plus /> {t('newAgent')}
      </Button>
    </span>
  ) : (
    <Link href="/dashboard/agents/new" className={buttonVariants()}>
      <Plus /> {t('newAgent')}
    </Link>
  )

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="app-title text-2xl font-semibold tracking-tight">{t('title')}</h1>
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
            <p className="text-lg font-medium">{t('noAgents')}</p>
            {canManage && (
              <Link href="/dashboard/agents/new" className={buttonVariants()}>
                {t('createFirst')}
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
                  <TableHead>{t('colName')}</TableHead>
                  <TableHead>{t('colLanguage')}</TableHead>
                  <TableHead>{t('colStatus')}</TableHead>
                  <TableHead>{t('colCreated')}</TableHead>
                  <TableHead className="text-right">{t('colActions')}</TableHead>
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
                        {a.is_active ? t('active') : t('inactive')}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString(locale, { timeZone: 'Europe/Prague' })}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <>
                          <Link
                            href={`/dashboard/agents/${a.id}`}
                            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                          >
                            {tc('edit')}
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
