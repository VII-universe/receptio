import { notFound } from 'next/navigation'
import { render } from '@react-email/render'
import { createElement } from 'react'
import { CallSummaryEmail } from '@/emails/call-summary'
import { InviteEmail } from '@/emails/invite'
import { LimitWarningEmail } from '@/emails/limit-warning'
import { TrialEmail } from '@/emails/trial-ending'
import { WelcomeEmail } from '@/emails/welcome'
import { isLocale } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

const MOCK_WORKSPACE = '00000000-0000-0000-0000-000000000000'

// GET /api/email/preview?template=call-summary|invite|welcome&locale=cs   (jen development)
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') return notFound()

  const params = new URL(request.url).searchParams
  const template = params.get('template')
  const rawLocale = params.get('locale')
  const locale = isLocale(rawLocale) ? rawLocale : 'en'

  let element
  switch (template) {
    case 'call-summary':
      element = createElement(CallSummaryEmail, {
        workspaceId: MOCK_WORKSPACE,
        agentName: 'Alex',
        callerNumber: '+420 777 123 456',
        duration: '2:34',
        startedAt: new Date('2026-10-06T12:32:00Z'),
        summary: 'The customer asked about weekend opening hours and booked a table for six on Saturday.',
        transcript: Array.from({ length: 10 }, (_, i) => ({
          role: i % 2 === 0 ? ('agent' as const) : ('customer' as const),
          text: i % 2 === 0 ? "Hello, Novak's Restaurant, how can I help you?" : 'Hi, I would like to book a table for six on Saturday.',
        })),
        callId: MOCK_WORKSPACE,
        dashboardUrl: `http://localhost:3000/dashboard/calls/${MOCK_WORKSPACE}`,
        locale,
      })
      break
    case 'invite':
      element = createElement(InviteEmail, {
        workspaceId: MOCK_WORKSPACE,
        inviterName: 'Jakub Fidler',
        workspaceName: "Novak's Restaurant",
        inviteUrl: 'https://example.com/invitation/abc123',
        locale,
      })
      break
    case 'welcome':
      element = createElement(WelcomeEmail, { workspaceId: MOCK_WORKSPACE, ownerName: 'Jakub', agentName: 'Alex', locale })
      break
    case 'limit-warning':
      element = createElement(LimitWarningEmail, { workspaceId: MOCK_WORKSPACE, planName: 'Starter', used: 100, max: 100, locale })
      break
    case 'trial-ending':
    case 'trial-ended':
      element = createElement(TrialEmail, { workspaceId: MOCK_WORKSPACE, variant: template === 'trial-ended' ? 'ended' : 'ending', daysLeft: 2, locale })
      break
    default:
      return Response.json({ error: 'Unknown template. Use call-summary, invite, welcome, limit-warning, trial-ending or trial-ended.' }, { status: 400 })
  }

  return new Response(await render(element), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
