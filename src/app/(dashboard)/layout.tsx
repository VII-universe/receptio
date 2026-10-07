import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getWorkspaceByClerkUserId } from '@/lib/supabase/queries'
import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/toast'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Nový uživatel (bez workspace nebo s nedokončeným onboardingem) projde nejdřív wizardem.
  // Přísná kontrola `=== false`: při chybějícím sloupci (nespuštěná migrace) nevznikne přesměrovací smyčka.
  const workspace = await getWorkspaceByClerkUserId(userId)
  if (!workspace || workspace.onboarding_completed === false) redirect('/onboarding')

  return (
    <Toaster>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </Toaster>
  )
}
