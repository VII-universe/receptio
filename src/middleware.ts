import { NextResponse } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Webhooky (/api/webhooks/*) a veřejné API (/api/v1/*, ověřuje API klíč) zůstávají bez Clerku.
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/agents(.*)',
  '/api/workspaces(.*)',
  '/api/phone-numbers(.*)',
  '/api/calls(.*)',
  '/api/billing(.*)',
  '/onboarding(.*)',
  '/api/onboarding(.*)',
  '/api/api-keys(.*)',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()

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
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
