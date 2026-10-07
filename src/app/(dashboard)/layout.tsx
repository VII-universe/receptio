import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { AccessDeniedToast } from '@/components/layout/access-denied-toast'
import { resolveWorkspaceContext } from '@/lib/workspace-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/toast'
import { DashboardI18nProvider } from './dashboard-i18n-provider'
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

  const locale = await getWorkspaceLocale()
  const messages = await loadMessages(locale)

  return (
    <DashboardI18nProvider locale={locale} messages={messages}>
      <Toaster>
        <AccessDeniedToast />
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar role={ctx.role} />
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </Toaster>
    </DashboardI18nProvider>
  )
}
