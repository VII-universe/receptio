'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { defaultVoiceFor } from '@/lib/agents/voices'
import { getLanguage, LANGUAGES, languageLabel } from '@/lib/languages'
import { BUSINESS_TYPES, templateFor, type BusinessType } from '@/lib/onboarding'
import { cn } from '@/lib/utils'

export function Wizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState<BusinessType | null>(null)

  const [agentName, setAgentName] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [language, setLanguage] = useState('cs')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const completeCalled = useRef(false)

  async function post(url: string, body: unknown) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return { res, data }
  }

  async function submitStep1() {
    if (!businessType) return
    setBusy(true)
    setError(null)
    try {
      const type = BUSINESS_TYPES.find((t) => t.id === businessType)!
      const { res } = await post('/api/workspaces', { name: businessName.trim(), industry: type.industry })
      // 409 = workspace už existuje (přerušený wizard), pokračujeme
      if (!res.ok && res.status !== 409) throw new Error()

      const t = templateFor(businessType, businessName.trim(), language)
      setAgentName(t.agentName)
      setFirstMessage(t.firstMessage)
      setSystemPrompt(t.systemPrompt)
      setStep(2)
    } catch {
      setError('Podnik se nepodařilo uložit. Zkuste to prosím znovu.')
    } finally {
      setBusy(false)
    }
  }

  async function submitStep2() {
    setBusy(true)
    setError(null)
    try {
      const { res, data } = await post('/api/agents', {
        name: agentName,
        firstMessage,
        systemPrompt,
        language,
        voiceId: defaultVoiceFor(language),
        endCallPhrases: getLanguage(language).endPhrases,
      })
      if (!res.ok) throw new Error(data.error ?? 'Vytvoření agenta se nezdařilo.')
      setStep(3)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vytvoření agenta se nezdařilo.')
    } finally {
      setBusy(false)
    }
  }

  // Krok 3: označit onboarding jako dokončený. Při selhání se dokončí při příštím vstupu do dashboardu.
  useEffect(() => {
    if (step !== 3 || completeCalled.current || !businessType) return
    completeCalled.current = true
    post('/api/onboarding/complete', { businessName: businessName.trim(), businessType }).catch(() => {})
  }, [step, businessName, businessType])

  function changeLanguage(next: string) {
    if (!businessType || next === language) return
    // Vygenerované hodnoty se přepíšou jen tehdy, když je uživatel ještě neupravil.
    const before = templateFor(businessType, businessName.trim(), language)
    const after = templateFor(businessType, businessName.trim(), next)
    if (agentName === before.agentName) setAgentName(after.agentName)
    if (firstMessage === before.firstMessage) setFirstMessage(after.firstMessage)
    setLanguage(next)
  }

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100

  return (
    <div>
      <div className="h-1 w-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="mx-auto max-w-[560px] px-4 py-10">
        <p className="mb-6 text-sm text-muted-foreground">Krok {step} ze 3</p>

        {step === 1 && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold">O vašem podniku</h1>
            <div className="flex flex-col gap-2">
              <Label htmlFor="businessName">Název podniku</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Obor</Label>
              <div className="grid grid-cols-2 gap-3">
                {BUSINESS_TYPES.map((t) => {
                  const selected = businessType === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setBusinessType(t.id)}
                      aria-pressed={selected}
                      className={cn(
                        'relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors hover:bg-muted/60',
                        selected ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30' : 'border-border'
                      )}
                    >
                      <span className="text-2xl" aria-hidden>
                        {t.icon}
                      </span>
                      <span className="text-sm font-medium">{t.label}</span>
                      {selected && (
                        <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Check className="size-3" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button disabled={busy || businessName.trim().length < 2 || !businessType} onClick={submitStep1}>
              {busy && <Loader2 className="animate-spin" />}
              Pokračovat
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <h1 className="text-2xl font-semibold">Nastavení agenta</h1>
            <div className="flex flex-col gap-2">
              <Label>Jazyk agenta</Label>
              <Select
                value={language}
                items={LANGUAGES.map((l) => ({ value: l.code, label: languageLabel(l) }))}
                onValueChange={(v) => v && changeLanguage(v)}
              >
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
              {language !== 'cs' && (
                <p className="text-sm text-muted-foreground">
                  Pokyn, aby agent mluvil jen tímto jazykem, se do promptu přidá automaticky. Hlas můžete později změnit
                  v nastavení agenta.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="agentName">Jméno agenta</Label>
              <Input id="agentName" value={agentName} maxLength={50} onChange={(e) => setAgentName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstMessage">Uvítací zpráva</Label>
              <Textarea id="firstMessage" rows={2} value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="systemPrompt">Systémový prompt</Label>
              <Textarea
                id="systemPrompt"
                rows={12}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              disabled={busy || !agentName.trim() || !firstMessage.trim() || !systemPrompt.trim()}
              onClick={submitStep2}
            >
              {busy && <Loader2 className="animate-spin" />}
              Vytvořit agenta
            </Button>
          </div>
        )}

        {step === 3 && (
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
              <h1 className="text-2xl font-semibold">Váš agent {agentName} je připraven!</h1>
              <p className="mt-2 text-muted-foreground">
                Nyní mu přiřaďte telefonní číslo, aby mohl přijímat hovory.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/dashboard/telefon" className={buttonVariants()}>
                Přiřadit číslo
              </Link>
              <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
                Přejít do dashboardu
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
