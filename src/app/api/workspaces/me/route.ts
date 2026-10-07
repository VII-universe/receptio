import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { publicWorkspace } from '@/lib/public-workspace'

// GET /api/workspaces/me – workspace přihlášeného uživatele (i člena týmu), bez Stripe identifikátorů
export async function GET() {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  return NextResponse.json({ workspace: publicWorkspace(ctx.workspace), role: ctx.role })
}
