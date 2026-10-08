import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { CookieBanner } from '@/components/consent/cookie-banner'
import { AccessDeniedToast } from '@/components/layout/access-denied-toast'
import { resolveWorkspaceContext } from '@/lib/workspace-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/toast'
import { DashboardI18nProvider } from './dashboard-i18n-provider'
import { TrialBanner } from '@/components/trial-banner'
import { isCurrentUserAdmin } from '@/lib/admin/require-admin'
import { planState } from '@/lib/billing/get-workspace-plan'
import { getWorkspaceLocale } from '@/lib/locale/get-workspace-locale'
import { loadMessages } from '@/i18n/messages'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Nový uživatel (bez workspace nebo s nedokončeným onboardingem) projde nejdřív wizardem.
  // Přísná kontrola `=== false`: při chybějícím sloupci (nespuštěná migrace) nevznikne přesměrovací smyčka.
  // Člen týmu onboarding nedělá (workspace nastavil vlastník), proto ho kvůli němu nepřesměrováváme.
  const ctx = await resolveWorkspaceContext()
  if (!ctx || (ctx.role === 'admin' && ctx.workspace.onboarding_completed === false)) redirect('/onboarding')

  const trial = planState(ctx.workspace)
  const isAdmin = await isCurrentUserAdmin()
  const locale = await getWorkspaceLocale()
  const messages = await loadMessages(locale)

  return (
    <DashboardI18nProvider locale={locale} messages={messages}>
      <Toaster>
        <AccessDeniedToast />
        <div className="relative flex min-h-screen flex-col overflow-x-clip bg-background md:flex-row">
          {/* Aurora na pozadí jako na landing page */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
            <div className="rc-grid absolute inset-0 opacity-60 dark:opacity-100" />
            <div className="rc-aurora absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-600/20" />
            <div className="rc-aurora absolute -right-40 bottom-0 h-[480px] w-[480px] rounded-full bg-violet-500/10 blur-[120px] [animation-delay:-6s] [animation-direction:alternate-reverse] dark:bg-violet-600/15" />
          </div>
          <Sidebar role={ctx.role} isAdmin={isAdmin} workspace={{ name: ctx.workspace.business_name ?? ctx.workspace.name, logoUrl: ctx.workspace.logo_url ?? null }} />
          <main className="relative min-w-0 flex-1 p-4 md:p-10">
            {(trial.isTrialing || trial.trialExpired) && (
              <TrialBanner daysLeft={trial.trialDaysLeft} expired={trial.trialExpired} canManage={ctx.role === 'admin'} />
            )}
            {children}
          </main>
        </div>
        <CookieBanner />
      </Toaster>
    </DashboardI18nProvider>
  )
}
