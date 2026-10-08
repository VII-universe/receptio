'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TestCallDialog } from '@/components/agents/test-call-dialog'
import { toast } from '@/components/ui/toast'
import { UpgradePrompt } from '@/components/upgrade-prompt'
import { parseLimitError, type LimitInfo } from '@/lib/billing/limit-error'
import { agentSchema, type AgentFormData } from '@/lib/agent-schema'
import { defaultVoiceFor, VOICE_CATALOG } from '@/lib/agents/voices'
import { getLanguage, LANGUAGES, languageLabel } from '@/lib/languages'

const RING_OPTIONS = [0, 1, 2, 3, 4] as const
// Hodnota mimo nabízený seznam (nastavená dřív) zůstane vybratelná.
const BASE_DURATIONS = [5, 10, 15, 30] as const
const durationValue = (m: number | null | undefined) => (m == null ? 'none' : String(m))

function PhraseInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const t = useTranslations('agents')
  const [draft, setDraft] = useState('')

  function add() {
    const phrase = draft.trim()
    if (phrase && !value.includes(phrase)) onChange([...value, phrase])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {value.map((p) => (
          <span key={p} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
            {p}
            <button
              type="button"
              aria-label={t('removePhrase', { phrase: p })}
              onClick={() => onChange(value.filter((x) => x !== p))}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        placeholder={t('phraseInput')}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault() // Enter nesmí odeslat formulář
            add()
          }
        }}
        onBlur={add}
      />
    </div>
  )
}

export function AgentForm({
  initial,
  agentId,
  hasPhoneNumber = false,
}: {
  initial: AgentFormData
  agentId?: string // je-li zadáno, jde o úpravu existujícího agenta
  hasPhoneNumber?: boolean // má agent přiřazené číslo (pro testovací hovor)
}) {
  const router = useRouter()
  const t = useTranslations('agents')
  const [deleting, setDeleting] = useState(false)
  const [limit, setLimit] = useState<LimitInfo | null>(null)
  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AgentFormData>({ resolver: zodResolver(agentSchema), defaultValues: initial })

  const language = watch('language')
  const voiceId = watch('voiceId')
  const currentName = watch('name')
  const maxDuration = watch('maxCallDurationMinutes')
  const DURATION_OPTIONS: (number | null)[] = [...BASE_DURATIONS, null]
  if (typeof maxDuration === 'number' && !DURATION_OPTIONS.includes(maxDuration)) DURATION_OPTIONS.unshift(maxDuration)
  const voices = [...VOICE_CATALOG]
  // Hlas nastavený mimo náš seznam (např. přímo ve Vapi) zůstane vybratelný.
  if (voiceId && !voices.some((v) => v.id === voiceId)) {
    voices.push({ id: voiceId, name: t('customVoice', { id: voiceId.slice(0, 6) }) })
  }

  async function onSubmit(values: AgentFormData) {
    try {
      const res = await fetch(agentId ? `/api/agents/${agentId}` : '/api/agents', {
        method: agentId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      const limitInfo = parseLimitError(data)
      if (limitInfo) {
        setLimit(limitInfo)
        return
      }
      if (!res.ok) throw new Error(data.error ?? t('saveFailed'))
      setLimit(null)
      toast.add({ type: 'success', title: agentId ? t('changesSaved') : t('created') })
      if (agentId) router.refresh()
      else router.push(`/dashboard/agents/${data.agent.id}`)
    } catch (e) {
      toast.add({
        type: 'error',
        title: t('saveFailed'),
        description: e instanceof Error ? e.message : undefined,
      })
    }
  }

  async function onDelete() {
    if (
      !agentId ||
      !window.confirm(t('deleteConfirm'))
    ) {
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('deleteFailed'))
      toast.add({ type: 'success', title: t('deleted') })
      router.push('/dashboard/agents')
      router.refresh()
    } catch (e) {
      toast.add({
        type: 'error',
        title: t('deleteFailed'),
        description: e instanceof Error ? e.message : undefined,
      })
      setDeleting(false)
    }
  }

  const error = (msg?: string) => (msg ? <p className="text-sm text-destructive">{msg}</p> : null)
  const busy = isSubmitting || deleting

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{t('basicSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t('agentLanguage')}</Label>
            <Controller
              control={control}
              name="language"
              render={({ field }) => (
                <Select
                  value={field.value}
                  items={LANGUAGES.map((l) => ({ value: l.code, label: languageLabel(l) }))}
                  onValueChange={(v) => {
                    if (!v || v === field.value) return
                    const prev = field.value
                    field.onChange(v)
                    // Výchozí hlas a ukončovací fráze se přepnou jen tehdy, když je uživatel nezměnil.
                    if (voiceId === defaultVoiceFor(prev)) setValue('voiceId', defaultVoiceFor(v), { shouldDirty: true })
                    const phrases = getValues('endCallPhrases')
                    if (JSON.stringify(phrases) === JSON.stringify(getLanguage(prev).endPhrases)) {
                      setValue('endCallPhrases', getLanguage(v).endPhrases, { shouldDirty: true })
                    }
                  }}
                >
                  <SelectTrigger className="w-full sm:w-80">
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
              )}
            />
            {language !== 'cs' && (
              <p className="text-sm text-yellow-600">
                {t('languageWarning')}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">{t('agentName')}</Label>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
            {error(errors.name?.message)}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="firstMessage">{t('greeting')}</Label>
            <Textarea
              id="firstMessage"
              rows={3}
              placeholder={t('greetingPlaceholder')}
              aria-invalid={!!errors.firstMessage}
              {...register('firstMessage')}
            />
            {error(errors.firstMessage?.message)}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t('voice')}</Label>
              <Controller
                control={control}
                name="voiceId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    items={voices.map((v) => ({ value: v.id, label: v.name }))}
                    onValueChange={(v) => v && field.onChange(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {error(errors.voiceId?.message)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('behavior')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="systemPrompt">{t('systemPrompt')}</Label>
            <Textarea
              id="systemPrompt"
              rows={14}
              placeholder={t('systemPromptPlaceholder')}
              aria-invalid={!!errors.systemPrompt}
              {...register('systemPrompt')}
            />
            {error(errors.systemPrompt?.message)}
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('endPhrases')}</Label>
            <Controller
              control={control}
              name="endCallPhrases"
              render={({ field }) => <PhraseInput value={field.value} onChange={field.onChange} />}
            />
            {error(errors.endCallPhrases?.message)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('callBehavior.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>{t('callBehavior.rings')}</Label>
            <Controller
              control={control}
              name="ringsBeforeAnswer"
              render={({ field }) => (
                <Select
                  value={String(field.value ?? 0)}
                  items={RING_OPTIONS.map((n) => ({ value: String(n), label: t(`callBehavior.ringsOption.${n}`) }))}
                  onValueChange={(v) => v != null && field.onChange(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RING_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {t(`callBehavior.ringsOption.${n}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">{t('callBehavior.ringsHint')}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('callBehavior.maxDuration')}</Label>
            <Controller
              control={control}
              name="maxCallDurationMinutes"
              render={({ field }) => (
                <Select
                  value={durationValue(field.value)}
                  items={DURATION_OPTIONS.map((m) => ({ value: durationValue(m), label: m === null ? t('callBehavior.unlimited') : t('callBehavior.minutes', { count: m }) }))}
                  onValueChange={(v) => v != null && field.onChange(v === 'none' ? null : Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((m) => (
                      <SelectItem key={durationValue(m)} value={durationValue(m)}>
                        {m === null ? t('callBehavior.unlimited') : t('callBehavior.minutes', { count: m })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">{t('callBehavior.maxDurationHint')}</p>
          </div>
        </CardContent>
      </Card>

      {limit && <UpgradePrompt {...limit} />}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {agentId ? t('saveChanges') : t('createAgent')}
        </Button>
        {agentId && (
          <TestCallDialog
            agentId={agentId}
            agentName={currentName?.trim() || initial.name}
            hasPhoneNumber={hasPhoneNumber}
            hasUnsavedChanges={isDirty}
          />
        )}
        {agentId && (
          <Button type="button" variant="destructive" disabled={busy} onClick={onDelete}>
            {deleting && <Loader2 className="animate-spin" />}
            {t('deleteAgent')}
          </Button>
        )}
      </div>
    </form>
  )
}
