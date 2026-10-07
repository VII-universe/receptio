import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { getPhoneNumbersByWorkspaceId } from '@/lib/phone-numbers'

// GET /api/phone-numbers – čísla workspace (ze Supabase, ne z Twilio)
export async function GET() {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  try {
    return NextResponse.json({ numbers: await getPhoneNumbersByWorkspaceId(ctx.workspace.id) })
  } catch (e) {
    console.error('Failed to load phone numbers', e)
    return NextResponse.json({ error: 'Failed to load phone numbers' }, { status: 500 })
  }
}
