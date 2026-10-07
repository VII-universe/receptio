// Sdílené (server i klient): kódy chyb při překročení limitu a jejich zpracování ve formulářích.

export const LIMIT_ERROR_CODES = {
  agents: 'AGENT_LIMIT_REACHED',
  phoneNumbers: 'PHONE_NUMBER_LIMIT_REACHED',
  teamMembers: 'TEAM_MEMBER_LIMIT_REACHED',
  knowledgeFiles: 'KNOWLEDGE_FILE_LIMIT_REACHED',
  minutes: 'MINUTES_LIMIT_REACHED',
} as const

export type LimitType = keyof typeof LIMIT_ERROR_CODES

export interface LimitInfo {
  limitType: LimitType
  current: number
  max: number
  plan: string
}

/** Z JSON těla odpovědi API vytáhne informace o limitu (null, pokud to není chyba limitu). */
export function parseLimitError(body: unknown): LimitInfo | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  const type = (Object.keys(LIMIT_ERROR_CODES) as LimitType[]).find((k) => LIMIT_ERROR_CODES[k] === b.error)
  if (!type) return null
  return {
    limitType: type,
    current: typeof b.current === 'number' ? b.current : 0,
    max: typeof b.max === 'number' ? b.max : 0,
    plan: typeof b.plan === 'string' ? b.plan : 'free',
  }
}
