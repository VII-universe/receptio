import Link from 'next/link'
import { effectivePlan } from '@/lib/billing/get-workspace-plan'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Bot, Plus } from 'lucide-react'
import { DeleteAgentButton } from '@/components/agents/delete-agent-button'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
            <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/30 rc-float">
              <Bot className="size-8" strokeWidth={1.6} />
            </span>
            <p className="text-lg font-medium">{t('noAgents')}</p>
            {canManage && (
              <Link href="/dashboard/agents/new" className={buttonVariants()}>
                {t('createFirst')}
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => {
            const lang = getLanguage(a.language)
            return (
              <div
                key={a.id}
                className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-0.5 hover:ring-primary/30 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_24px_60px_-28px_rgb(0_0_0/0.7)] dark:backdrop-blur-xl"
              >
                <div className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-primary/15 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
                <div className="relative flex items-start gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/30" aria-hidden>
                    <Bot className="size-6" strokeWidth={1.6} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold tracking-tight">
                      {canManage ? (
                        <Link href={`/dashboard/agents/${a.id}`} className="after:absolute after:inset-0 hover:underline">
                          {a.name}
                        </Link>
                      ) : (
                        a.name
                      )}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground" title={lang.name}>
                      {lang.flag} {a.language.split('-')[0].toUpperCase()}
                      {a.language.includes('-') && <span className="text-xs"> ({a.language.split('-')[1]})</span>}
                    </p>
                  </div>
                  <span
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${a.is_active ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}
                  >
                    <span className={`size-1.5 rounded-full ${a.is_active ? 'animate-pulse bg-emerald-500 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]' : 'bg-muted-foreground/60'}`} aria-hidden />
                    {a.is_active ? t('active') : t('inactive')}
                  </span>
                </div>
                <div className="relative flex items-center justify-between gap-2 border-t border-border pt-4">
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {t('colCreated')}: {new Date(a.created_at).toLocaleDateString(locale, { timeZone: 'Europe/Prague' })}
                  </span>
                  {canManage && (
                    <div className="relative z-10 flex items-center">
                      <Link href={`/dashboard/agents/${a.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                        {tc('edit')}
                      </Link>
                      <DeleteAgentButton agentId={a.id} name={a.name} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
