'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface Values {
  email: string
  phone: string
  enabled: boolean
}

export function SettingsForm({ initial }: { initial: Values }) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/workspaces/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_email: values.email,
          notification_phone: values.phone,
          notifications_enabled: values.enabled,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Uložení se nepodařilo.')
      setMessage({ type: 'ok', text: 'Nastavení bylo uloženo.' })
      router.refresh()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Uložení se nepodařilo.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Notifikace po hovoru</CardTitle>
          <CardDescription>
            Po každém skončeném hovoru vám pošleme shrnutí emailem a/nebo SMS.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Switch
              id="enabled"
              checked={values.enabled}
              onCheckedChange={(enabled) => setValues((v) => ({ ...v, enabled }))}
            />
            <Label htmlFor="enabled">Notifikace zapnuty</Label>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email pro notifikace</Label>
            <Input
              id="email"
              type="email"
              placeholder="jmeno@firma.cz"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Telefon pro SMS</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+420123456789"
              value={values.phone}
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
            />
            <p className="text-sm text-muted-foreground">V mezinárodním formátu. Nechte prázdné, pokud SMS nechcete.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={saving}>
              {saving ? 'Ukládám…' : 'Uložit'}
            </Button>
            {message && (
              <p className={message.type === 'ok' ? 'text-sm text-green-600' : 'text-sm text-destructive'}>
                {message.text}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
