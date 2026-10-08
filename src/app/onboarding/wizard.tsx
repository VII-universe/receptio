'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { TestCallDialog } from '@/components/agents/test-call-dialog'
import { WebTestCall } from '@/components/onboarding/web-test-call'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { defaultVoiceFor } from '@/lib/agents/voices'
import { getLanguage, LANGUAGES, languageLabel } from '@/lib/languages'
import { BUSINESS_TYPES, DEFAULT_AGENT_NAME, templateFor, type BusinessType } from '@/lib/onboarding'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3
// Průvodce nabízí pět oborů; "Obchod" je dostupný jen v nastavení.
const TYPES = BUSINESS_TYPES.filter((b) => b.id !== 'shop')
const storageKey = (userId: string) => `onboarding_step_${userId}`

interface WizardAgent {
  id: string
  name: string
}

/**
 * Průvodce pro nového uživatele: 1) podnik a agent, 2) zkušební hovor, 3) hotovo.
 * Aktuální krok je v URL (?step=) i v localStorage, takže po zavření okna se uživatel vrátí tam, kde skončil.
 */
export function Wizard({
  defaultLanguage = 'cs',
  userId,
  initialAgent,
  initialStep,
  hasPhoneNumber,
}: {
  defaultLanguage?: string
  userId: string
  initialAgent: WizardAgent | null
  initialStep: Step | null
  hasPhoneNumber: boolean
}) {
  const t = useTranslations('onboarding')
  const [agent, setAgent] = useState<WizardAgent | null>(initialAgent)
  const [step, setStep] = useState<Step>(initialAgent ? (initialStep ?? 2) : 1)
  const [tested, setTested] = useState(false)

  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState<BusinessType | null>(null)
  const [agentName, setAgentName] = useState(DEFAULT_AGENT_NAME)
  const [language, setLanguage] = useState(defaultLanguage)
  const [currency, setCurrency] = useState<'CZK' | 'EUR'>(defaultLanguage === 'cs' || defaultLanguage === 'sk' ? 'CZK' : 'EUR')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Po nezdařeném dokončení (agent už existuje) se při opakování nevytváří druhý agent.
  const [created, setCreated] = useState<WizardAgent | null>(initialAgent)

  function goTo(next: Step) {
    setStep(next)
    try {
      window.localStorage.setItem(storageKey(userId), String(next))
    } catch {
      /* úložiště nemusí být dostupné; krok pak drží jen URL */
    }
    const url = new URL(window.location.href)
    url.searchParams.set('step', String(next))
    window.history.replaceState(null, '', url)
  }

  // Bez ?step= v URL se obnoví krok z localStorage (agent musí existovat, jinak se začíná od začátku).
  useEffect(() => {
    if (!initialAgent || initialStep) return
    try {
      const stored = Number(window.localStorage.getItem(storageKey(userId)))
      if (stored === 2 || stored === 3) goTo(stored)
    } catch {
      /* viz výše */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return { res, data: await res.json().catch(() => ({})) }
  }

  async function createAgent() {
    if (!businessType) return
    setBusy(true)
    setError(null)
    try {
      const name = businessName.trim()
      let current = created
      if (!current) {
        const type = BUSINESS_TYPES.find((b) => b.id === businessType)!
        const ws = await post('/api/workspaces', { name, industry: type.industry, currency })
        // 409 = workspace už existuje (přerušený průvodce), pokračujeme
        if (!ws.res.ok && ws.res.status !== 409) throw new Error(t('saveFailed'))

        // Prompt, pozdrav a hlas se nastaví automaticky podle oboru a jazyka.
        const tpl = templateFor(businessType, name, language, agentName.trim() || DEFAULT_AGENT_NAME)
        const { res, data } = await post('/api/agents', {
          name: tpl.agentName,
          firstMessage: tpl.firstMessage,
          systemPrompt: tpl.systemPrompt,
          language,
          voiceId: defaultVoiceFor(language),
          endCallPhrases: getLanguage(language).endPhrases,
        })
        if (!res.ok) throw new Error(data.error ?? t('createFailed'))
        current = { id: data.agent.id, name: data.agent.name }
        setCreated(current)
      }

      // Dokončení: nastaví obor, spustí zkušební dobu (kvůli minutám pro zkušební hovor) a doplní znalostní bázi.
      const done = await post('/api/onboarding/complete', { businessName: name, businessType })
      if (!done.res.ok) throw new Error(t('completeFailed'))

      setAgent(current)
      goTo(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('createFailed'))
    } finally {
      setBusy(false)
    }
  }

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100

  return (
    <div>
      <div className="h-1 w-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="mx-auto max-w-[560px] px-4 py-10">
        <p className="mb-6 text-sm text-muted-foreground">{t('stepOf', { step })}</p>

        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold">{t('createTitle')}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t('createSubtitle')}</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('industry')}</Label>
              <div className="grid grid-cols-2 gap-3">
                {TYPES.map((b) => {
                  const selected = businessType === b.id
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBusinessType(b.id)}
                      aria-pressed={selected}
                      className={cn(
                        'relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors hover:bg-muted/60',
                        selected ? 'border-primary bg-muted' : 'border-border'
                      )}
                    >
                      <span className="text-2xl" aria-hidden>
                        {b.icon}
                      </span>
                      <span className="text-sm font-medium">{t(`businessTypes.${b.id}`)}</span>
                      {selected && (
                        <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="businessName">{t('businessName')}</Label>
              <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="agentName">{t('agentName')}</Label>
                <Input id="agentName" value={agentName} maxLength={50} onChange={(e) => setAgentName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t('agentLanguage')}</Label>
                <Select value={language} items={LANGUAGES.map((l) => ({ value: l.code, label: languageLabel(l) }))} onValueChange={(v) => v && setLanguage(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {languageLabel(l)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('billingCurrency')}</Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'CZK', label: `🇨🇿 ${t('currencyCzk')}` },
                  { value: 'EUR', label: `🇪🇺 ${t('currencyEur')}` },
                ] as const).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={currency === o.value}
                    onClick={() => setCurrency(o.value)}
                    className={cn(
                      'rounded-xl border-2 p-3 text-sm font-medium transition-colors hover:bg-muted/60',
                      currency === o.value ? 'border-primary bg-muted' : 'border-border'
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t('currencyHint')}</p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              size="lg"
              className="h-12"
              disabled={busy || businessName.trim().length < 2 || !businessType || !agentName.trim()}
              onClick={createAgent}
            >
              {busy && <Loader2 className="animate-spin" />}
              {t('createCta')}
            </Button>
          </div>
        )}

        {step === 2 && agent && (
          <div className="flex flex-col items-center gap-6 py-4 text-center">
            <div>
              <h1 className="text-2xl font-semibold">{t('test.title', { name: agent.name })}</h1>
              <p className="mt-3 text-muted-foreground">{t('test.intro')}</p>
            </div>

            <WebTestCall agentId={agent.id} onFinished={() => setTested(true)} />

            {hasPhoneNumber && (
              <TestCallDialog agentId={agent.id} agentName={agent.name} hasPhoneNumber hasUnsavedChanges={false} />
            )}

            {tested && (
              <Button size="lg" className="h-12 px-8" onClick={() => goTo(3)}>
                {t('test.continue')}
              </Button>
            )}
            <button type="button" onClick={() => goTo(3)} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
              {t('test.skip')}
            </button>
          </div>
        )}

        {step === 3 && agent && (
          <div className="flex flex-col items-center gap-6 py-6 text-center">
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden style={{ animation: 'pop-in 0.4s ease-out both' }}>
              <circle cx="48" cy="48" r="44" className="fill-green-100 stroke-green-600 dark:fill-green-950" strokeWidth="4" />
              <path
                d="M28 50 L42 64 L68 34"
                className="stroke-green-600"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="60"
                strokeDashoffset="60"
                style={{ animation: 'draw-check 0.5s 0.3s ease-out forwards' }}
              />
            </svg>
            <div>
              <h1 className="text-2xl font-semibold">{t('readyTitle', { name: agent.name })}</h1>
              <p className="mt-2 text-muted-foreground">{t('readyText')}</p>
            </div>
            <ul className="flex flex-col gap-2 text-left text-sm">
              {(['can1', 'can2', 'can3'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
                  {t(k)}
                </li>
              ))}
            </ul>
            <div className="flex w-full flex-col gap-3">
              <Link href="/dashboard" className={cn(buttonVariants({ size: 'lg' }), 'h-12 text-base')}>
                {t('goDashboard')}
              </Link>
              <Link href="/dashboard/phone-numbers" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'h-12 text-base')}>
                {t('assignNumber')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
