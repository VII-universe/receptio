import 'server-only'
import { missingLegalFields } from '@/lib/legal'
import { createAdminClient } from '@/lib/supabase/admin'

export type Status = 'ok' | 'warn' | 'fail'
export interface Check {
  service: string
  item: string
  status: Status
  note?: string // krátké vysvětlení; nikdy ne hodnota proměnné ani tělo odpovědi API
}

const env = (name: string) => (process.env[name] ?? '').trim()
const present = (name: string) => env(name).length > 0

/** Proměnná musí být vyplněná; hodnota se nikdy nevrací, jen výsledek. */
function setCheck(service: string, name: string): Check {
  return { service, item: name, status: present(name) ? 'ok' : 'fail', note: present(name) ? undefined : 'Missing' }
}

/** Vyplněná proměnná s očekávaným živým prefixem; testovací/vývojový klíč je jen varování. */
function keyCheck(service: string, name: string, live: string[], test: string): Check {
  const v = env(name)
  if (!v) return { service, item: `${name} (${live[0]}…)`, status: 'fail', note: 'Missing' }
  if (live.some((p) => v.startsWith(p))) return { service, item: `${name} (${live[0]}…)`, status: 'ok' }
  return { service, item: `${name} (${live[0]}…)`, status: 'warn', note: v.startsWith(test) ? 'Test key' : 'Unexpected key format' }
}

/** Volání externího API na serveru. Vrací jen stav (nikdy tělo odpovědi ani chybovou zprávu, mohly by obsahovat tajemství). */
async function fetchStatus(url: string, headers: Record<string, string>): Promise<{ ok: boolean; status?: number; json?: unknown }> {
  try {
    const res = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(8000) })
    const json = res.ok ? await res.json().catch(() => undefined) : undefined
    return { ok: res.ok, status: res.status, json }
  } catch {
    return { ok: false }
  }
}

const apiResult = (service: string, item: string, r: { ok: boolean; status?: number }): Check =>
  r.ok ? { service, item, status: 'ok' } : { service, item, status: 'fail', note: r.status ? `HTTP ${r.status}` : 'No response' }

export async function runChecks(): Promise<Check[]> {
  const checks: Check[] = []

  // Stripe
  checks.push(keyCheck('Stripe', 'STRIPE_SECRET_KEY', ['sk_live_', 'rk_live_'], 'sk_test_'))
  for (const n of [
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_STARTER',
    'STRIPE_PRICE_BUSINESS',
    'STRIPE_PRICE_PRO',
    'STRIPE_PRICE_STARTER_EUR',
    'STRIPE_PRICE_BUSINESS_EUR',
    'STRIPE_PRICE_PRO_EUR',
    'STRIPE_PORTAL_CONFIGURATION_ID',
  ]) {
    checks.push(setCheck('Stripe', n))
  }

  // Clerk
  checks.push(keyCheck('Clerk', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', ['pk_live_'], 'pk_test_'))
  checks.push(keyCheck('Clerk', 'CLERK_SECRET_KEY', ['sk_live_'], 'sk_test_'))

  // Supabase
  checks.push(setCheck('Supabase', 'NEXT_PUBLIC_SUPABASE_URL'))
  checks.push(setCheck('Supabase', 'SUPABASE_SERVICE_ROLE_KEY'))

  // Vapi, ElevenLabs a Resend: klíč + živé volání API (souběžně)
  const vapiKey = env('VAPI_API_KEY')
  const elKey = env('ELEVENLABS_API_KEY')
  const resendKey = env('RESEND_API_KEY')

  const [db, vapi, eleven, resend] = await Promise.all([
    // SELECT 1 přes klienta nejde; stačí nejlevnější dotaz na tabulku, který ověří URL, klíč i dostupnost databáze.
    (async () => {
      try {
        const { error } = await createAdminClient().from('workspaces').select('id', { head: true, count: 'exact' }).limit(1)
        return !error
      } catch {
        return false
      }
    })(),
    vapiKey ? fetchStatus('https://api.vapi.ai/assistant?limit=1', { Authorization: `Bearer ${vapiKey}` }) : Promise.resolve(null),
    elKey ? fetchStatus('https://api.elevenlabs.io/v1/user', { 'xi-api-key': elKey }) : Promise.resolve(null),
    resendKey ? fetchStatus('https://api.resend.com/domains', { Authorization: `Bearer ${resendKey}` }) : Promise.resolve(null),
  ])

  checks.push({ service: 'Supabase', item: 'Database connection (SELECT)', status: db ? 'ok' : 'fail', note: db ? undefined : 'Query failed' })

  checks.push(setCheck('Vapi', 'VAPI_API_KEY'))
  checks.push(setCheck('Vapi', 'VAPI_WEBHOOK_SECRET'))
  checks.push(vapi ? apiResult('Vapi', 'API reachable (GET /assistant)', vapi) : { service: 'Vapi', item: 'API reachable (GET /assistant)', status: 'fail', note: 'No API key' })

  // Aplikace ELEVENLABS_API_KEY sama nečte (hlasy ElevenLabs jede Vapi), proto chybějící klíč není chyba, jen varování.
  checks.push(
    elKey
      ? { service: 'ElevenLabs', item: 'ELEVENLABS_API_KEY', status: 'ok' }
      : { service: 'ElevenLabs', item: 'ELEVENLABS_API_KEY', status: 'warn', note: 'Not set (the app uses ElevenLabs through Vapi)' }
  )
  checks.push(
    eleven
      ? apiResult('ElevenLabs', 'API reachable (GET /v1/user)', eleven)
      : { service: 'ElevenLabs', item: 'API reachable (GET /v1/user)', status: 'warn', note: 'No API key' }
  )

  checks.push(setCheck('Resend', 'RESEND_API_KEY'))
  // Ověřovaná doména je doména odesílatele (RESEND_FROM_EMAIL, i ve tvaru "Jméno <adresa>"); výchozí je receptio.cz.
  const fromDomain = (env('RESEND_FROM_EMAIL').match(/@([^>\s]+)>?\s*$/)?.[1] ?? 'receptio.cz').toLowerCase()
  const domainItem = `Domain ${fromDomain} verified`
  if (!resend) {
    checks.push({ service: 'Resend', item: domainItem, status: 'fail', note: 'No API key' })
  } else if (!resend.ok) {
    checks.push(apiResult('Resend', domainItem, resend))
  } else {
    const domains = (resend.json as { data?: { name?: string; status?: string }[] } | undefined)?.data ?? []
    const d = domains.find((x) => x.name?.toLowerCase() === fromDomain)
    checks.push({
      service: 'Resend',
      item: domainItem,
      status: d?.status === 'verified' ? 'ok' : d ? 'warn' : 'fail',
      note: d?.status === 'verified' ? undefined : d ? `Status: ${d.status ?? 'unknown'}` : 'Domain not found',
    })
  }

  // Twilio
  for (const n of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']) checks.push(setCheck('Twilio', n))

  // App
  const appUrl = env('NEXT_PUBLIC_APP_URL')
  if (!appUrl) checks.push({ service: 'App', item: 'NEXT_PUBLIC_APP_URL (not localhost)', status: 'fail', note: 'Missing' })
  else if (/localhost|127\.0\.0\.1/.test(appUrl)) checks.push({ service: 'App', item: 'NEXT_PUBLIC_APP_URL (not localhost)', status: 'fail', note: 'Points to localhost' })
  else if (appUrl.endsWith('.vercel.app') || appUrl.includes('.vercel.app/')) checks.push({ service: 'App', item: 'NEXT_PUBLIC_APP_URL (not localhost)', status: 'warn', note: 'Still a vercel.app address, not the final domain' })
  else if (!appUrl.startsWith('https://')) checks.push({ service: 'App', item: 'NEXT_PUBLIC_APP_URL (not localhost)', status: 'warn', note: 'Not HTTPS' })
  else checks.push({ service: 'App', item: 'NEXT_PUBLIC_APP_URL (not localhost)', status: 'ok' })
  checks.push(setCheck('App', 'CRON_SECRET'))

  // Právní dokumenty (zásady, podmínky) ukazují [●], dokud nejsou vyplněné údaje o provozovateli.
  const missingLegal = missingLegalFields()
  checks.push({
    service: 'Legal',
    item: 'Operator details in privacy policy and terms',
    status: missingLegal.length === 0 ? 'ok' : 'fail',
    note: missingLegal.length === 0 ? undefined : `Missing: ${missingLegal.map((k) => `NEXT_PUBLIC_LEGAL_${k === 'companyId' ? 'ID' : k.toUpperCase()}`).join(', ')}`,
  })

  return checks
}
