import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { syncWorkspaceConnections } from '@/lib/calendar/sync'

export const maxDuration = 60

// POST /api/calendar/sync – načte nejnovější události ze všech napojených kalendářů workspace (tlačítko "Obnovit" v kalendáři)
export async function POST() {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  const result = await syncWorkspaceConnections(ctx.workspace.id, { minAgeMs: 30_000 })
  return NextResponse.json(result)
}
