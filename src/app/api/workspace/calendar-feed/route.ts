import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { feedUrls, getOrCreateFeedToken } from '@/lib/calendar/feed'

// GET – odkaz pro odběr kalendáře Receptio v jiných aplikacích (vytvoří se při prvním volání)
// POST – vygeneruje nový odkaz; starý přestane fungovat (použijte, když odkaz uniknul)
async function respond(rotate: boolean) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  try {
    const token = await getOrCreateFeedToken(ctx.workspace.id, rotate)
    return NextResponse.json(feedUrls(token))
  } catch (e) {
    console.error('Calendar feed link failed (is migration 032 applied?)', e)
    return NextResponse.json({ error: 'Failed to create the calendar link' }, { status: 500 })
  }
}
export const GET = () => respond(false)
export const POST = () => respond(true)
