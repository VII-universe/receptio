import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isBusinessType } from '@/lib/onboarding'
import { getWorkspaceByClerkUserId } from '@/lib/supabase/queries'

// POST /api/onboarding/complete  Body: { businessName, businessType }
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspace = await getWorkspaceByClerkUserId(userId)
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const businessName = typeof body?.businessName === 'string' ? body.businessName.trim() : ''
  if (businessName.length < 2 || businessName.length > 100 || !isBusinessType(body?.businessType)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { error } = await createAdminClient()
    .from('workspaces')
    .update({ business_name: businessName, business_type: body.businessType, onboarding_completed: true })
    .eq('id', workspace.id)
  if (error) {
    console.error('Failed to complete onboarding', error)
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }

  // Zdroj pravdy je databáze; Clerk metadata jsou jen pomocná kopie (např. pro budoucí middleware).
  try {
    await (await clerkClient()).users.updateUserMetadata(userId, { publicMetadata: { onboardingCompleted: true } })
  } catch (e) {
    console.error('Clerk: failed to update metadata', e)
  }
  return NextResponse.json({ ok: true })
}
