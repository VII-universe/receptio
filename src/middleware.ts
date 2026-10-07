import { NextResponse } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import createIntlMiddleware from 'next-intl/middleware'
import { LOCALES, routing } from '@/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

// Marketing stránky s locale v adrese (/, /cs, /en/pricing…). Dashboard, API, přihlášení a ostatní stránky
// zůstávají bez locale v URL; jejich jazyk určuje nastavení workspace.
const isMarketingRoute = createRouteMatcher(['/', `/(${LOCALES.join('|')})(.*)`, '/cennik'])

// Webhooky (/api/webhooks/*) a veřejné API (/api/v1/*, ověřuje API klíč) zůstávají bez Clerku.
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/agents(.*)',
  '/api/workspaces(.*)',
  '/api/workspace(.*)',
  '/api/usage(.*)',
  '/api/phone-numbers(.*)',
  '/api/calls(.*)',
  '/api/analytics(.*)',
  '/api/team(.*)',
  '/api/webhooks/manage(.*)', // správa zákaznických webhooků; /api/webhooks/vapi a /stripe zůstávají veřejné
  '/api/billing(.*)',
  '/onboarding(.*)',
  '/api/onboarding(.*)',
  '/api/api-keys(.*)',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)'])

// Stránky, na které člen týmu (org:member) nesmí. Seznam agentů (/dashboard/agents) je čtecí, takže tu není.
const isAdminOnlyPage = createRouteMatcher([
  '/dashboard/phone-numbers(.*)',
  '/dashboard/billing(.*)',
  '/dashboard/settings(.*)',
  '/dashboard/agents/(.+)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()

  // První vrstva: člen týmu s aktivní organizací. Rozhodující kontrola je na serveru
  // (getAdminWorkspace / requireWorkspaceAdmin), která funguje i bez aktivní organizace v session.
  if (isAdminOnlyPage(req)) {
    const { orgRole } = await auth()
    if (orgRole === 'org:member') return NextResponse.redirect(new URL('/dashboard?denied=1', req.url))
  }

  if (isAdminRoute(req)) {
    await auth.protect()
    // První vrstva: role v session tokenu (jen pokud je v Clerk dashboardu přidána do session claims,
    // viz README). Rozhodující kontrola je requireAdmin()/requireAdminPage() na serveru.
    const { sessionClaims } = await auth()
    const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role
    if (role !== undefined && role !== 'admin') {
      return req.nextUrl.pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  if (isMarketingRoute(req)) return intlMiddleware(req)
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
