import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Webhooky (/api/webhooks/*) zůstávají veřejné – ověřují se vlastním tajemstvím.
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/agents(.*)',
  '/api/workspaces(.*)',
  '/api/phone-numbers(.*)',
  '/api/calls(.*)',
  '/api/billing(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
