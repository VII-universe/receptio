'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DAYS, LANGUAGE_OPTIONS } from '@/lib/constants'
import type { BusinessHours, FaqItem } from '@/types'

export interface AgentFormValues {
  name: string
  language: 'cs' | 'sk' | 'en'
  greetingMessage: string
  fallbackPhone: string
  businessHours: BusinessHours
  customInstructions: string
  faq: FaqItem[]
}

export function AgentForm({ initial, exists }: { initial: AgentFormValues; exists: boolean }) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const set = <K extends keyof AgentFormValues>(key: K, value: AgentFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  function setDay(day: keyof BusinessHours, patch: Partial<BusinessHours[keyof BusinessHours]>) {
    set('businessHours', {
      ...values.businessHours,
      [day]: { ...values.businessHours[day], ...patch },
    })
  }

  function setFaq(index: number, patch: Partial<FaqItem>) {
    set('faq', values.faq.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.name.trim() || !values.greetingMessage.trim()) {
      setMessage({ type: 'error', text: 'Vyplňte jméno asistenta a uvítací zprávu.' })
      return
    }

    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/agents', {
        method: exists ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          // prázdné dvojice FAQ neukládáme
          faq: values.faq.filter((f) => f.question.trim() && f.answer.trim()),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Uložení se nepodařilo.')
      setMessage({ type: 'ok', text: 'Asistent byl uložen.' })
      router.refresh()
      if (!exists) router.push('/dashboard')
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Uložení se nepodařilo.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Základní nastavení</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Jméno asistenta</Label>
            <Input id="name" value={values.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Jazyk</Label>
            <Select
              value={values.language}
              onValueChange={(v) => v && set('language', v as AgentFormValues['language'])}
              items={LANGUAGE_OPTIONS as unknown as { value: string; label: string }[]}
            >
              <SelectTrigger className="w-full sm:w-60">
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
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="greeting">Uvítací zpráva</Label>
            <Textarea
              id="greeting"
              rows={3}
              placeholder="Dobrý den, tady Aida z..."
              value={values.greetingMessage}
              onChange={(e) => set('greetingMessage', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fallback">Záložní telefon pro přepojení (nepovinné)</Label>
            <Input
              id="fallback"
              type="tel"
              placeholder="+420 ..."
              value={values.fallbackPhone}
              onChange={(e) => set('fallbackPhone', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Otevírací doba</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {DAYS.map(({ key, label }) => {
            const day = values.businessHours[key]
            return (
              <div key={key} className="flex flex-wrap items-center gap-3">
                <span className="w-24 text-sm">{label}</span>
                <Switch
                  checked={day.open}
                  onCheckedChange={(open) => setDay(key, { open })}
                  aria-label={`${label} otevřeno`}
                />
                {day.open ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      className="w-28"
                      value={day.from}
                      onChange={(e) => setDay(key, { from: e.target.value })}
                      aria-label={`${label} od`}
                    />
                    <span>–</span>
                    <Input
                      type="time"
                      className="w-28"
                      value={day.to}
                      onChange={(e) => setDay(key, { to: e.target.value })}
                      aria-label={`${label} do`}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Zavřeno</span>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Znalostní báze</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="instructions">Vlastní instrukce</Label>
            <Textarea
              id="instructions"
              rows={5}
              value={values.customInstructions}
              onChange={(e) => set('customInstructions', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Label>Časté otázky</Label>
            {values.faq.map((f, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
                <Input
                  placeholder="Otázka"
                  value={f.question}
                  onChange={(e) => setFaq(i, { question: e.target.value })}
                />
                <Textarea
                  placeholder="Odpověď"
                  rows={2}
                  value={f.answer}
                  onChange={(e) => setFaq(i, { answer: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-end"
                  onClick={() => set('faq', values.faq.filter((_, j) => j !== i))}
                >
                  <Trash2 /> Odebrat
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="self-start"
              onClick={() => set('faq', [...values.faq, { question: '', answer: '' }])}
            >
              <Plus /> Přidat otázku
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Ukládám…' : exists ? 'Uložit změny' : 'Uložit agenta'}
        </Button>
        {message && (
          <p className={message.type === 'ok' ? 'text-sm text-green-600' : 'text-sm text-destructive'}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  )
}
