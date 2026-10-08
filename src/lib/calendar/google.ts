import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Booking } from '@/types'
import { bookingIdFromUid, type CalendarProviderClient, type ExternalEvent } from './types'

// Google Calendar přes REST API (fetch) – bez těžkého balíčku googleapis.
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const SCOPES = 'openid email https://www.googleapis.com/auth/calendar.events'

export interface GoogleConfig {
  refresh_token: string
  access_token?: string
  expires_at?: number // ms
  email?: string
}

interface GoogleEvent {
  id: string
  iCalUID?: string
  status?: string
  summary?: string
  visibility?: string
  transparency?: string
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
  extendedProperties?: { private?: { receptioBookingId?: string } }
}

export const googleConfigured = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
export const googleRedirectUri = () => `${process.env.NEXT_PUBLIC_APP_URL}/api/workspace/calendar-connections/google/callback`

const stateKey = () => process.env.CLERK_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'receptio'
const sign = (payload: string) => createHmac('sha256', stateKey()).update(payload).digest('base64url')

/** Podepsaný `state` pro OAuth (workspace + náhodná hodnota, která je i v cookie) – chrání před CSRF. */
export function createOAuthState(workspaceId: string) {
  const nonce = randomBytes(16).toString('base64url')
  const payload = `${workspaceId}.${nonce}`
  return { state: `${payload}.${sign(payload)}`, nonce }
}

export function verifyOAuthState(state: string | null, nonceCookie: string | undefined, workspaceId: string): boolean {
  if (!state || !nonceCookie) return false
  const [ws, nonce, sig] = state.split('.')
  if (!ws || !nonce || !sig || ws !== workspaceId || nonce !== nonceCookie) return false
  const expected = sign(`${ws}.${nonce}`)
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

export function googleAuthUrl(state: string): string {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent', // bez toho Google refresh token při opakovaném souhlasu nevrací
    state,
  })
  return `${AUTH_URL}?${q}`
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...body }),
    signal: AbortSignal.timeout(15_000),
  })
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; id_token?: string; error?: string }
  if (!res.ok || !json.access_token) throw new Error(`Google token request failed: ${json.error ?? res.status}`)
  return json
}

/** Vymění autorizační kód za tokeny; z id_tokenu vezme e-mail účtu. */
export async function exchangeGoogleCode(code: string): Promise<GoogleConfig> {
  const t = await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: googleRedirectUri() })
  if (!t.refresh_token) throw new Error('Google did not return a refresh token')
  let email: string | undefined
  try {
    email = JSON.parse(Buffer.from(t.id_token!.split('.')[1], 'base64url').toString()).email
  } catch {
    /* e-mail je jen popisek */
  }
  return { refresh_token: t.refresh_token, access_token: t.access_token, expires_at: Date.now() + (t.expires_in ?? 3600) * 1000, email }
}

export function googleClient(initial: GoogleConfig): CalendarProviderClient {
  let config = { ...initial }
  let changed = false

  async function token() {
    if (config.access_token && config.expires_at && config.expires_at > Date.now() + 60_000) return config.access_token
    const t = await tokenRequest({ refresh_token: config.refresh_token, grant_type: 'refresh_token' })
    config = { ...config, access_token: t.access_token, expires_at: Date.now() + (t.expires_in ?? 3600) * 1000 }
    changed = true
    return config.access_token!
  }

  async function call(path: string, init: RequestInit = {}) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', ...init.headers },
      signal: AbortSignal.timeout(15_000),
    })
    if (res.status === 204) return null
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw Object.assign(new Error(`Google Calendar error ${res.status}`), { status: res.status })
    return json as Record<string, unknown>
  }

  return {
    canWrite: true,
    updatedConfig: () => (changed ? config : null),

    async fetchEvents(from, to) {
      const out: ExternalEvent[] = []
      let pageToken: string | undefined
      for (let page = 0; page < 10; page++) {
        const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', showDeleted: 'true', maxResults: '250' })
        if (pageToken) q.set('pageToken', pageToken)
        const json = (await call(`?${q}`)) as { items?: GoogleEvent[]; nextPageToken?: string }
        for (const e of json.items ?? []) {
          const allDay = !!e.start?.date
          const start = new Date(e.start?.dateTime ?? `${e.start?.date}T00:00:00Z`)
          const end = new Date(e.end?.dateTime ?? `${e.end?.date}T00:00:00Z`)
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue
          out.push({
            id: e.id,
            bookingId: e.extendedProperties?.private?.receptioBookingId ?? bookingIdFromUid(e.iCalUID),
            start,
            end,
            allDay,
            cancelled: e.status === 'cancelled',
            transparent: e.transparency === 'transparent',
            title: e.visibility === 'private' || e.visibility === 'confidential' ? null : (e.summary?.trim() || null),
          })
        }
        pageToken = json.nextPageToken
        if (!pageToken) break
      }
      return out
    },

    async upsertEvent(booking: Booking, label: string, existingId) {
      const body = {
        summary: label,
        description: [booking.caller_phone && `Tel: ${booking.caller_phone}`, booking.notes].filter(Boolean).join('\n') || undefined,
        start: { dateTime: booking.starts_at },
        end: { dateTime: booking.ends_at },
        status: booking.status === 'confirmed' ? 'confirmed' : 'tentative',
        extendedProperties: { private: { receptioBookingId: booking.id } },
      }
      if (existingId) {
        try {
          const r = await call(`/${encodeURIComponent(existingId)}`, { method: 'PATCH', body: JSON.stringify(body) })
          return (r?.id as string) ?? existingId
        } catch (e) {
          if ((e as { status?: number }).status !== 404 && (e as { status?: number }).status !== 410) throw e // smazanou událost vytvoříme znovu
        }
      }
      const r = await call('', { method: 'POST', body: JSON.stringify(body) })
      return r?.id as string
    },

    async deleteEvent(externalId) {
      try {
        await call(`/${encodeURIComponent(externalId)}`, { method: 'DELETE' })
      } catch (e) {
        if ((e as { status?: number }).status !== 404 && (e as { status?: number }).status !== 410) throw e
      }
    },
  }
}
