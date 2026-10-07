import 'server-only'
import { NextResponse } from 'next/server'
import { LIMIT_ERROR_CODES, type LimitType } from './limit-error'
import type { LimitCheck } from './check-limit'

/** 403 s kódem chyby (např. AGENT_LIMIT_REACHED) a údaji pro UpgradePrompt v UI. */
export function limitReachedResponse(type: LimitType, check: Pick<LimitCheck, 'current' | 'max' | 'plan'>): NextResponse {
  return NextResponse.json(
    { error: LIMIT_ERROR_CODES[type], limit: type, current: check.current, max: check.max, plan: check.plan },
    { status: 403 }
  )
}
