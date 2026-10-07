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

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
