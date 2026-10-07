'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { agentSchema, type AgentFormData } from '@/lib/agent-schema'
import { LANGUAGE_OPTIONS, VOICES } from '@/lib/constants'

function PhraseInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
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
              aria-label={`Odebrat ${p}`}
              onClick={() => onChange(value.filter((x) => x !== p))}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        placeholder="Napište frázi a stiskněte Enter"
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
}: {
  initial: AgentFormData
  agentId?: string // je-li zadáno, jde o úpravu existujícího agenta
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AgentFormData>({ resolver: zodResolver(agentSchema), defaultValues: initial })

  const language = watch('language')
  const voiceId = watch('voiceId')
  const voices = [...VOICES[language]]
  // Hlas nastavený mimo náš seznam (např. přímo ve Vapi) zůstane vybratelný.
  if (voiceId && !voices.some((v) => v.id === voiceId)) {
    voices.push({ id: voiceId, name: `Vlastní hlas (${voiceId.slice(0, 6)}…)` })
  }

  async function onSubmit(values: AgentFormData) {
    try {
      const res = await fetch(agentId ? `/api/agents/${agentId}` : '/api/agents', {
        method: agentId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Uložení se nepodařilo.')
      toast.add({ type: 'success', title: agentId ? 'Změny byly uloženy' : 'Agent byl vytvořen' })
      if (agentId) router.refresh()
      else router.push(`/dashboard/agents/${data.agent.id}`)
    } catch (e) {
      toast.add({
        type: 'error',
        title: 'Uložení se nepodařilo',
        description: e instanceof Error ? e.message : undefined,
      })
    }
  }

  async function onDelete() {
    if (
      !agentId ||
      !window.confirm('Opravdu smazat agenta? Smaže se i historie jeho hovorů a akci nelze vrátit.')
    ) {
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Smazání se nepodařilo.')
      toast.add({ type: 'success', title: 'Agent byl smazán' })
      router.push('/dashboard/agents')
      router.refresh()
    } catch (e) {
      toast.add({
        type: 'error',
        title: 'Smazání se nepodařilo',
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
          <CardTitle>Základní nastavení</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Jméno agenta</Label>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
            {error(errors.name?.message)}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="firstMessage">Uvítací zpráva</Label>
            <Textarea
              id="firstMessage"
              rows={3}
              placeholder="Dobrý den, toto je recepce restaurace U Nováků..."
              aria-invalid={!!errors.firstMessage}
              {...register('firstMessage')}
            />
            {error(errors.firstMessage?.message)}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Jazyk</Label>
              <Controller
                control={control}
                name="language"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    items={LANGUAGE_OPTIONS as unknown as { value: string; label: string }[]}
                    onValueChange={(v) => {
                      if (!v) return
                      field.onChange(v)
                      // Hlas musí odpovídat jazyku.
                      const list = VOICES[v as AgentFormData['language']]
                      if (!list.some((x) => x.id === voiceId)) setValue('voiceId', list[0].id)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Hlas</Label>
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
          <CardTitle>Chování agenta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="systemPrompt">Systémový prompt</Label>
            <Textarea
              id="systemPrompt"
              rows={14}
              placeholder="Jsi Aida, recepční restaurace U Nováků. Přijímáš rezervace stolů a odpovídáš na dotazy k menu a otevírací době..."
              aria-invalid={!!errors.systemPrompt}
              {...register('systemPrompt')}
            />
            {error(errors.systemPrompt?.message)}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Fráze pro ukončení hovoru</Label>
            <Controller
              control={control}
              name="endCallPhrases"
              render={({ field }) => <PhraseInput value={field.value} onChange={field.onChange} />}
            />
            {error(errors.endCallPhrases?.message)}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {agentId ? 'Uložit změny' : 'Vytvořit agenta'}
        </Button>
        {agentId && (
          <Button type="button" variant="destructive" disabled={busy} onClick={onDelete}>
            {deleting && <Loader2 className="animate-spin" />}
            Smazat agenta
          </Button>
        )}
      </div>
    </form>
  )
}
