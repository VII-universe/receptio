import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { publicWorkspace } from '@/lib/public-workspace'
import { getWorkspaceByClerkUserId } from '@/lib/supabase/queries'

// GET /api/workspaces/me
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const workspace = await getWorkspaceByClerkUserId(userId)
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }
  return NextResponse.json({ workspace: publicWorkspace(workspace) })
}
